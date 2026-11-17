import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

/* Login por telefone + PIN de 4 dígitos (mesma regra de js/core.js → NC.authFromPhone) */
const phoneDigits = (p: unknown) => { let d = String(p ?? "").replace(/\D/g, ""); if (d.length >= 10 && d.length <= 11) d = "55" + d; return d; };
const authEmail = (d: string) => `${d}@tel.nexcube3d.com.br`;
const authPass = (d: string, pin: string) => `NC#${pin}#${d}`;
const validPhone = (d: string) => /^55\d{10,11}$/.test(d);
const validPin = (p: unknown) => /^\d{4}$/.test(String(p ?? ""));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const roleCount = async (role: string) => { const { count } = await admin.from("nc_profiles").select("id", { count: "exact", head: true }).eq("role", role); return count ?? 0; };
    async function upsertUser(phone: string, pin: string, name?: string) {
      const email = authEmail(phone);
      const { data: existing } = await admin.rpc("nc_user_id_by_email", { p_email: email });
      if (existing) {
        const { error } = await admin.auth.admin.updateUserById(existing as string, { password: authPass(phone, pin), user_metadata: { phone, name: name ?? null } });
        if (error) throw error;
        return { uid: existing as string, isNew: false };
      }
      const { data, error } = await admin.auth.admin.createUser({ email, password: authPass(phone, pin), email_confirm: true, user_metadata: { phone, name: name ?? null } });
      if (error) throw error;
      return { uid: data.user!.id, isNew: true };
    }
    const roleOfPhone = async (phone: string) => {
      const { data: uid } = await admin.rpc("nc_user_id_by_email", { p_email: authEmail(phone) });
      if (!uid) return { uid: null, role: null };
      const { data: p } = await admin.from("nc_profiles").select("role").eq("id", uid).maybeSingle();
      return { uid: uid as string, role: p?.role ?? null };
    };

    /* ---------- público: primeiro acesso (só enquanto não existir ninguém com o papel) ---------- */
    if (action === "has_admin") return json({ has_admin: (await roleCount("superadmin")) > 0 });
    if (action === "has_dds") return json({ has_dds: (await roleCount("dds")) > 0 });
    if (action === "bootstrap_admin" || action === "bootstrap_dds") {
      const role = action === "bootstrap_admin" ? "superadmin" : "dds";
      if ((await roleCount(role)) > 0) return json({ error: "Este acesso já foi criado. Entre com telefone e PIN." }, 403);
      const phone = phoneDigits(body.phone), pin = String(body.pin ?? "");
      if (!validPhone(phone)) return json({ error: "Telefone inválido. Use DDD + número." }, 400);
      if (!validPin(pin)) return json({ error: "O PIN deve ter exatamente 4 números." }, 400);
      const ex = await roleOfPhone(phone);
      if (ex.role && ex.role !== role) return json({ error: "Este telefone já é usado em outro acesso. Use outro número." }, 409);
      const r = await upsertUser(phone, pin, body.name);
      await admin.from("nc_profiles").upsert({ id: r.uid, role, full_name: body.name ?? null, email: phone });
      await admin.from("nc_audit_logs").insert({ actor_user_id: r.uid, action: role === "dds" ? "dds_bootstrap" : "admin_bootstrap", entity_type: "access", metadata: { phone } });
      return json({ ok: true });
    }

    /* ---------- daqui para baixo: somente superadmin logado ---------- */
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: me } = await admin.from("nc_profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "superadmin") return json({ error: "Sem permissão" }, 403);
    const audit = (a: string, customer: string | null, meta: Record<string, unknown>) =>
      admin.from("nc_audit_logs").insert({ actor_user_id: user.id, customer_id: customer, action: a, entity_type: "access", entity_id: customer, metadata: meta });

    if (action === "set_client_access") {
      const customerId = String(body.customer_id ?? "");
      const { data: cust } = await admin.from("nc_customers").select("id, contact_name, company_name, owner_user_id").eq("id", customerId).maybeSingle();
      if (!cust) return json({ error: "Cliente não encontrado" }, 404);
      const phone = phoneDigits(body.phone), pin = String(body.pin ?? "");
      if (!validPhone(phone)) return json({ error: "Telefone inválido. Use DDD + número." }, 400);
      if (!validPin(pin)) return json({ error: "O PIN deve ter exatamente 4 números." }, 400);
      const ex = await roleOfPhone(phone);
      if (ex.role && ex.role !== "client") return json({ error: "Este telefone pertence a um administrador. Use outro número." }, 409);
      if (ex.uid) {
        const { data: other } = await admin.from("nc_customers").select("id").eq("owner_user_id", ex.uid).neq("id", cust.id).limit(1);
        if (other && other.length) return json({ error: "Este telefone já é o login de outro cliente." }, 409);
      }
      const r = await upsertUser(phone, pin, cust.contact_name ?? cust.company_name);
      if (!ex.role) await admin.from("nc_profiles").upsert({ id: r.uid, role: "client", full_name: cust.contact_name, email: phone });
      await admin.from("nc_customers").update({ owner_user_id: r.uid, phone }).eq("id", cust.id);
      await audit(cust.owner_user_id ? "client_pin_reset" : "client_invited", cust.id, { phone, new_user: r.isNew });
      return json({ ok: true, phone });
    }

    if (action === "create_admin") {
      const phone = phoneDigits(body.phone), pin = String(body.pin ?? "");
      if (!validPhone(phone)) return json({ error: "Telefone inválido." }, 400);
      if (!validPin(pin)) return json({ error: "O PIN deve ter exatamente 4 números." }, 400);
      const ex = await roleOfPhone(phone);
      if (ex.role && ex.role !== "superadmin") return json({ error: "Este telefone já é usado em outro acesso. Use outro número." }, 409);
      const r = await upsertUser(phone, pin, body.name);
      await admin.from("nc_profiles").upsert({ id: r.uid, role: "superadmin", full_name: body.name ?? null, email: phone });
      await audit("admin_invited", null, { phone });
      return json({ ok: true });
    }

    if (action === "remove_access") {
      const customerId = String(body.customer_id ?? "");
      await admin.from("nc_customers").update({ owner_user_id: null }).eq("id", customerId);
      await audit("client_access_removed", customerId, {});
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    const msg = String((e as Error)?.message ?? "");
    if (/password/i.test(msg)) return json({ error: "Não foi possível salvar o PIN. Tente outro." }, 400);
    return json({ error: "Não foi possível concluir. Tente novamente." }, 500);
  }
});
