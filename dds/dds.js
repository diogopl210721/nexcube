/* Painel DDS Inovação — /dds : pedidos de mini site, vendas, comissões (Pix manual) e preço */
(function () {
  const NC = window.NC, C = window.NC_CONFIG, e = NC.esc, ic = NC.icon, ED = NC.editor;
  const root = NC.$("#root");
  const S = { me: null, customers: [], leads: [], sales: [], comms: [], price: null, tab: "pedidos" };
  const LEAD_ST = { new: ["Novo", "info"], contact: ["Em conversa", "warn"], sold: ["Vendido", "ok"], lost: ["Não fechou", ""] };
  const KIND = { nexcube: "Link da Nexcube", client: "Indicação de cliente", self: "Cliente da tag (p/ si)" };
  const money = (v) => ED.fmtMoney(v) || "—";
  const cname = (id) => (S.customers.find((c) => c.id === id) || {}).company_name || "—";
  const model = (id) => ((window.NC_MS.models.find((m) => m.id === id)) || {}).full || "—";

  async function fn(body) {
    const { data, error } = await NC.sb.functions.invoke("nc-admin", { body });
    if (error) { let m = error.message; try { const j = await error.context.json(); m = j.error || m; } catch (x) {} throw new Error(m); }
    return data;
  }

  async function boot() {
    const s = await NC.getProfile();
    if (!s) {
      let has = true; try { has = (await fn({ action: "has_dds" })).has_dds; } catch (x) {}
      if (!has) return first();
      return NC.renderLogin(root, { title: "DDS Inovação", subtitle: "Vendas e comissões", onDone: boot });
    }
    if (!s.profile || s.profile.role !== "dds") {
      await NC.sb.auth.signOut();
      NC.toast("Este acesso é exclusivo da DDS Inovação.", "err");
      return NC.renderLogin(root, { title: "DDS Inovação", subtitle: "Vendas e comissões", onDone: boot });
    }
    S.me = s; await load(); shell();
  }

  function first() {
    root.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="auth-brand"><img src="/assets/logo-cube.png" alt=""><div><b>DDS Inovação</b><small>Primeiro acesso</small></div></div>
      <h1>Criar acesso DDS</h1><p class="muted small">Esta tela aparece só uma vez.</p>
      <form id="fF" class="stack" style="margin-top:1rem">
        <label>Seu nome<input name="name" required></label>
        <label>Telefone (WhatsApp)<input name="phone" type="tel" inputmode="tel" required></label>
        <label>Repita o telefone<input name="phone2" type="tel" inputmode="tel" required></label>
        ${NC.pinInput("pin", "Crie um PIN de 4 números")}${NC.pinInput("pin2", "Repita o PIN")}
        <button class="btn primary block">Criar e entrar</button></form></div></div>`;
    const f = NC.$("#fF"); NC.maskPhone(f.phone); NC.maskPhone(f.phone2);
    f.onsubmit = async (ev) => {
      ev.preventDefault(); const ok = NC.checkPhonePin(f); if (!ok) return;
      const btn = NC.$("button", f); btn.disabled = true;
      try { await fn({ action: "bootstrap_dds", name: f.name.value.trim(), phone: ok.phone, pin: ok.pin });
        const { error } = await NC.sb.auth.signInWithPassword(NC.authFromPhone(ok.phone, ok.pin)); if (error) throw error; boot(); }
      catch (err) { NC.err(err); btn.disabled = false; }
    };
  }

  async function load() {
    const [c, l, s, cm, p] = await Promise.all([
      NC.sb.from("nc_customers").select("id,company_name,phone,ref_code").order("company_name"),
      NC.sb.from("nc_ref_leads").select("*").order("created_at", { ascending: false }).limit(500),
      NC.sb.from("nc_sales").select("*").order("sold_at", { ascending: false }).limit(500),
      NC.sb.from("nc_commissions").select("*").order("created_at", { ascending: false }).limit(1000),
      NC.sb.from("nc_settings").select("value").eq("key", "minisite_price").maybeSingle()
    ]);
    S.customers = c.data || []; S.leads = l.data || []; S.sales = s.data || []; S.comms = cm.data || [];
    S.price = p.data && p.data.value ? p.data.value.value : null;
  }

  function shell() {
    root.innerHTML = `
    <div class="mtop"><span></span><b>DDS · Vendas e comissões</b><img src="/assets/logo-cube.png" alt=""></div>
    <main class="main" style="max-width:1200px;margin:0 auto">
      <div class="topbar"><div><h1>DDS · Mini sites da rede Nexcube</h1><p class="muted">Registre vendas e pague comissões por Pix · Nexcube 30% · cliente que indicou 10%</p></div>
        <div class="row"><button class="btn" id="price">${ic("edit", 18)} Preço: ${money(S.price)}</button><button class="btn primary" id="newSale">${ic("plus", 18)} Registrar venda</button><button class="btn ghost" id="out">${ic("logout", 18)} Sair</button></div></div>
      <div id="kp"></div>
      <div class="tabs">${[["pedidos", "Pedidos"], ["comissoes", "Comissões a pagar"], ["vendas", "Vendas"]].map(([k, l]) => `<button data-t="${k}">${l}</button>`).join("")}</div>
      <div id="tv"></div>
    </main>`;
    NC.$("#out").onclick = async () => { await NC.sb.auth.signOut(); boot(); };
    NC.$("#price").onclick = editPrice;
    NC.$("#newSale").onclick = () => saleForm();
    NC.$$("[data-t]").forEach((b) => (b.onclick = () => { S.tab = b.dataset.t; draw(); }));
    draw();
  }

  function draw() {
    const pend = S.comms.filter((x) => x.status === "pending");
    const sum = (a) => a.reduce((t, x) => t + Number(x.amount), 0);
    NC.$("#kp").innerHTML = `<div class="cards">
      <div class="kpi"><span>${ic("users", 16)} Pedidos novos</span><b>${S.leads.filter((x) => x.status === "new").length}</b><small>${S.leads.length} no total</small></div>
      <div class="kpi"><span>${ic("rocket", 16)} Vendas</span><b>${S.sales.length}</b><small>${money(S.sales.reduce((t, x) => t + Number(x.value), 0))}</small></div>
      <div class="kpi"><span>${ic("clock", 16)} A pagar (Nexcube)</span><b>${money(sum(pend.filter((x) => x.beneficiary === "nexcube")))}</b><small>30%</small></div>
      <div class="kpi"><span>${ic("clock", 16)} A pagar (clientes)</span><b>${money(sum(pend.filter((x) => x.beneficiary === "client")))}</b><small>10%</small></div></div>`;
    NC.$$("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === S.tab));
    ({ pedidos, comissoes, vendas })[S.tab](NC.$("#tv"));
  }

  function pedidos(v) {
    v.innerHTML = `<div class="tbl-wrap resp"><table><thead><tr><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Origem</th><th>Modelo</th><th>Situação</th><th></th></tr></thead><tbody>
      ${S.leads.length ? S.leads.map((x) => `<tr><td class="small" data-label="Data">${NC.fmtDateTime(x.created_at)}</td>
        <td class="full" data-label="Nome"><b>${e(x.name)}</b>${x.business ? `<div class="muted tiny">${e(x.business)}</div>` : ""}</td>
        <td data-label="WhatsApp"><a target="_blank" rel="noopener" href="${NC.waLink(x.whatsapp, "Olá " + x.name.split(" ")[0] + "! Aqui é da DDS Inovação, sobre o seu mini site.")}">${e(NC.fmtPhone(x.whatsapp))}</a></td>
        <td class="small" data-label="Origem">${e(KIND[x.ref_kind])}${x.customer_id ? `<div class="muted tiny">${e(cname(x.customer_id))}</div>` : ""}</td>
        <td class="small" data-label="Modelo">${e(model(x.model))}</td>
        <td data-label="Situação"><select data-st="${x.id}" ${x.status === "sold" ? "disabled" : ""}>${Object.entries(LEAD_ST).map(([k, l]) => `<option value="${k}" ${x.status === k ? "selected" : ""} ${k === "sold" ? "disabled" : ""}>${l[0]}</option>`).join("")}</select></td>
        <td class="full" data-label="">${x.status !== "sold" ? `<button class="btn sm primary" data-sale="${x.id}">${ic("check", 16)} Registrar venda</button>` : `<span class="badge ok">Vendido</span>`}</td></tr>`).join("")
        : `<tr><td colspan="7"><div class="empty">${ic("users", 30)}Nenhum pedido ainda.</div></td></tr>`}</tbody></table></div>`;
    NC.$$("[data-st]", v).forEach((s) => (s.onchange = async () => {
      const { error } = await NC.sb.from("nc_ref_leads").update({ status: s.value, updated_at: new Date().toISOString() }).eq("id", s.dataset.st);
      if (error) return NC.err(error); S.leads.find((x) => x.id === s.dataset.st).status = s.value; NC.toast("Situação atualizada."); draw();
    }));
    NC.$$("[data-sale]", v).forEach((b) => (b.onclick = () => saleForm(S.leads.find((x) => x.id === b.dataset.sale))));
  }

  function comissoes(v) {
    const pend = S.comms.filter((x) => x.status === "pending");
    const groups = {};
    pend.forEach((x) => { const k = x.beneficiary === "nexcube" ? "nexcube" : x.customer_id; (groups[k] = groups[k] || []).push(x); });
    const paid = S.comms.filter((x) => x.status === "paid").slice(0, 50);
    v.innerHTML = `${Object.keys(groups).length ? Object.entries(groups).map(([k, arr]) => {
        const cust = S.customers.find((c) => c.id === k);
        const who = k === "nexcube" ? "Nexcube 3D (30%)" : (cust ? cust.company_name + " (10%)" : "Cliente");
        const phone = k === "nexcube" ? C.nexcubeWhatsapp : cust && cust.phone;
        return `<div class="card section"><div class="row between"><div><h3 style="margin:0">${e(who)}</h3><span class="muted small">${arr.length} comissão(ões) pendente(s)${phone ? " · " + e(NC.fmtPhone(phone)) : ""}</span></div>
          <div class="row"><b style="font-size:1.3rem">${money(arr.reduce((t, x) => t + Number(x.amount), 0))}</b><button class="btn primary sm" data-payall="${k}">${ic("check", 16)} Marcar tudo como pago</button></div></div>
          <div class="feed" style="margin-top:.6rem">${arr.map((x) => { const sa = S.sales.find((s2) => s2.id === x.sale_id) || {}; return `<div><span class="dot">${ic("rocket", 16)}</span><span class="grow">${e(sa.buyer_name || "—")} · ${money(sa.value)}<small>${NC.fmtDate(sa.sold_at)} · ${Number(x.percent)}%</small></span><b>${money(x.amount)}</b><button class="btn sm" data-pay="${x.id}">Pago</button></div>`; }).join("")}</div></div>`;
      }).join("") : `<div class="card empty">${ic("check", 30)}Nenhuma comissão pendente.</div>`}
      <div class="card"><h3>Pagas recentemente</h3>${paid.length ? `<div class="feed">${paid.map((x) => `<div><span class="dot">${ic("check", 16)}</span><span class="grow">${x.beneficiary === "nexcube" ? "Nexcube 3D" : e(cname(x.customer_id))}<small>Pago em ${NC.fmtDate(x.paid_at)}${x.pix_note ? " · " + e(x.pix_note) : ""}</small></span><b>${money(x.amount)}</b><button class="btn sm ghost" data-undo="${x.id}">Desfazer</button></div>`).join("")}</div>` : `<div class="empty">Nada pago ainda.</div>`}</div>`;
    const pay = async (ids) => {
      const note = await new Promise((res) => NC.modal({ title: "Confirmar pagamento por Pix", body: `<label>Observação do Pix <small>(opcional: data, ID da transação)</small><input id="pn" maxlength="200"></label>`,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: () => res(null) }, { label: "Confirmar pago", cls: "primary", onClick: (w) => res(NC.$("#pn", w).value.trim() || "") }] }));
      if (note === null) return;
      const { error } = await NC.sb.from("nc_commissions").update({ status: "paid", pix_note: note || null }).in("id", ids);
      if (error) return NC.err(error); NC.toast("Pagamento registrado."); await load(); draw();
    };
    NC.$$("[data-pay]", v).forEach((b) => (b.onclick = () => pay([b.dataset.pay])));
    NC.$$("[data-payall]", v).forEach((b) => (b.onclick = () => pay(groups[b.dataset.payall].map((x) => x.id))));
    NC.$$("[data-undo]", v).forEach((b) => (b.onclick = async () => { if (!(await NC.confirm("Desfazer pagamento", "Voltar esta comissão para 'a receber'?", "Desfazer", false))) return; const { error } = await NC.sb.from("nc_commissions").update({ status: "pending", pix_note: null }).eq("id", b.dataset.undo); if (error) return NC.err(error); await load(); draw(); }));
  }

  function vendas(v) {
    v.innerHTML = `<div class="tbl-wrap resp"><table><thead><tr><th>Data</th><th>Cliente final</th><th>Origem</th><th>Valor</th><th>Comissões</th><th></th></tr></thead><tbody>
      ${S.sales.length ? S.sales.map((x) => { const cs = S.comms.filter((c) => c.sale_id === x.id); return `<tr><td class="small" data-label="Data">${NC.fmtDate(x.sold_at)}</td>
        <td class="full" data-label="Cliente final"><b>${e(x.buyer_name)}</b><div class="muted tiny">${e(model(x.model))}${x.minisite_url ? ` · <a href="${e(x.minisite_url)}" target="_blank" rel="noopener">site</a>` : ""}</div></td>
        <td class="small" data-label="Origem">${e(KIND[x.ref_kind])}${x.referrer_customer_id ? `<div class="muted tiny">${e(cname(x.referrer_customer_id))}</div>` : ""}</td>
        <td data-label="Valor"><b>${money(x.value)}</b></td>
        <td class="small" data-label="Comissões">${cs.map((c) => `${c.beneficiary === "nexcube" ? "Nexcube" : "Cliente"} ${money(c.amount)} <span class="badge ${c.status === "paid" ? "ok" : "warn"}">${c.status === "paid" ? "pago" : "a pagar"}</span>`).join("<br>")}</td>
        <td data-label=""><button class="icon-btn danger" data-del="${x.id}" title="Excluir venda">${ic("trash", 18)}</button></td></tr>`; }).join("")
        : `<tr><td colspan="6"><div class="empty">Nenhuma venda registrada.</div></td></tr>`}</tbody></table></div>`;
    NC.$$("[data-del]", v).forEach((b) => (b.onclick = async () => {
      if (!(await NC.confirm("Excluir venda", "A venda e as comissões dela serão apagadas. Use só para corrigir lançamentos errados.", "Excluir"))) return;
      const { error } = await NC.sb.from("nc_sales").delete().eq("id", b.dataset.del); if (error) return NC.err(error); await load(); draw();
    }));
  }

  function saleForm(lead) {
    const MS = window.NC_MS;
    NC.modal({
      title: "Registrar venda de mini site",
      body: `<form class="stack" id="fS">
        <label>Origem da venda<select name="kind"><option value="nexcube">Link da Nexcube (Nexcube 30%)</option><option value="client">Indicação de cliente da tag (Nexcube 30% + cliente 10%)</option><option value="self">Cliente da tag comprou para si (só Nexcube 30%)</option></select></label>
        <label id="refL">Cliente da tag<select name="ref"><option value="">—</option>${S.customers.map((c) => `<option value="${c.id}">${e(c.company_name)}</option>`).join("")}</select></label>
        <label>Nome do comprador<input name="buyer" required maxlength="120"></label>
        <div class="grid2"><label>Valor (R$)<input name="value" required inputmode="decimal" placeholder="0,00"></label><label>Data da venda<input name="date" type="date" required></label></div>
        <label>Modelo<select name="model"><option value="">—</option>${MS.models.map((m) => `<option value="${m.id}">${e(m.full)}</option>`).join("")}</select></label>
        <label>Link do mini site <small>(se já estiver no ar)</small><input name="url" placeholder="https://..."></label>
        <div class="alert info small" id="calc"></div></form>`,
      onOpen: (w) => {
        const f = NC.$("#fS", w);
        f.date.value = new Date().toISOString().slice(0, 10);
        if (S.price) f.value.value = String(S.price).replace(".", ",");
        if (lead) { f.kind.value = lead.ref_kind; f.ref.value = lead.customer_id || ""; f.buyer.value = lead.name; f.model.value = lead.model || ""; }
        const upd = () => {
          NC.$("#refL", w).style.display = f.kind.value === "nexcube" ? "none" : "";
          const val = parseFloat(String(f.value.value).replace(/\./g, "").replace(",", ".")) || 0;
          NC.$("#calc", w).innerHTML = `${ic("sparkle", 18)}<span>Nexcube 30%: <b>${money(val * 0.3)}</b>${f.kind.value === "client" ? ` · Cliente 10%: <b>${money(val * 0.1)}</b>` : ""}</span>`;
        };
        f.addEventListener("input", upd); f.addEventListener("change", upd); upd();
      },
      actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Registrar venda", cls: "primary", onClick: async (w) => {
        const f = NC.$("#fS", w); if (!f.reportValidity()) return false;
        const val = parseFloat(String(f.value.value).replace(/\./g, "").replace(",", "."));
        if (!(val > 0)) { NC.toast("Informe o valor da venda.", "err"); return false; }
        if (f.kind.value !== "nexcube" && !f.ref.value) { NC.toast("Escolha o cliente da tag.", "err"); return false; }
        let url = f.url.value.trim(); if (url) { url = NC.normalizeUrl(url); if (!url) { NC.toast("Link inválido.", "err"); return false; } }
        const row = { lead_id: lead ? lead.id : null, ref_kind: f.kind.value, referrer_customer_id: f.kind.value === "nexcube" ? null : f.ref.value, buyer_name: f.buyer.value.trim(), model: f.model.value || null, value: Math.round(val * 100) / 100, minisite_url: url || null, sold_at: f.date.value };
        const { error } = await NC.sb.from("nc_sales").insert(row);
        if (error) { NC.err(error); return false; }
        NC.toast("Venda registrada! Comissões geradas."); await load(); S.tab = "comissoes"; draw();
      } }]
    });
  }

  function editPrice() {
    NC.modal({ title: "Preço do mini site", body: `<label>Valor (pagamento único)<input id="pv" inputmode="decimal" value="${S.price != null ? String(S.price).replace(".", ",") : ""}" placeholder="Ex.: 497,00"></label><p class="muted small" style="margin-top:.5rem">Aparece para a Nexcube, para os clientes da tag e na página de indicação. Deixe vazio para mostrar "sob consulta".</p>`,
      actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Salvar", cls: "primary", onClick: async (w) => {
        const raw = NC.$("#pv", w).value.trim(); const val = raw ? parseFloat(raw.replace(/\./g, "").replace(",", ".")) : null;
        if (raw && !(val > 0)) { NC.toast("Valor inválido.", "err"); return false; }
        const { error } = await NC.sb.from("nc_settings").upsert({ key: "minisite_price", value: { value: val, note: "pagamento único" }, updated_at: new Date().toISOString() });
        if (error) { NC.err(error); return false; }
        S.price = val; NC.toast("Preço atualizado."); shell();
      } }] });
  }

  boot();
})();
