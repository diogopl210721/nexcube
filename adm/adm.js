/* Gerenciador Nexcube 3D — /adm (somente superadministrador) */
(function () {
  const NC = window.NC, C = window.NC_CONFIG, e = NC.esc, ic = NC.icon, ED = NC.editor;
  const root = NC.$("#root");
  const S = { me: null, customers: [], tags: [] };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "chart" },
    { id: "clientes", label: "Clientes", icon: "users" },
    { id: "tags", label: "Tags e QR Codes", icon: "tag" },
    { id: "minisites", label: "Mini sites", icon: "rocket" },
    { id: "config", label: "Configurações", icon: "gear" }
  ];
  const ST = { active: ["Ativo", "ok"], pending: ["Pendente", "warn"], suspended: ["Suspenso", "bad"] };
  const MS = { none: ["Não contratado", ""], requested: ["Solicitado", "info"], in_progress: ["Em desenvolvimento", "warn"], published: ["Publicado", "ok"] };
  const RQ = { received: "Recebido", analysis: "Em análise", waiting_content: "Aguardando conteúdo", in_development: "Em desenvolvimento", waiting_approval: "Aguardando aprovação", published: "Publicado", cancelled: "Cancelado" };
  const badge = (map, k) => `<span class="badge ${map[k] ? map[k][1] : ""}">${e(map[k] ? map[k][0] : k)}</span>`;
  const ACT = {
    customer_created: "Novo cliente cadastrado", customer_status: "Status do cliente alterado", minisite_updated: "Mini site atualizado",
    tag_created: "Nova tag criada", tag_reassigned: "Tag vinculada/alterada de cliente", tag_status: "Tag ativada/suspensa", tag_destination: "Destino da tag alterado",
    tag_code_changed: "Código da tag alterado", minisite_requested: "Solicitação de mini site", minisite_request_status: "Status da solicitação alterado",
    client_invited: "Acesso do cliente criado", client_access_link: "Novo link de acesso gerado", client_access_removed: "Acesso do cliente removido", admin_invited: "Administrador adicionado", client_pin_reset: "Telefone/PIN do cliente alterado", admin_bootstrap: "Administrador principal criado"
  };
  const ACT_IC = { customer_created: "users", tag_created: "tag", tag_reassigned: "tag", tag_status: "tag", tag_destination: "nfc", minisite_requested: "rocket", minisite_request_status: "rocket", minisite_updated: "rocket" };

  async function fn(body) {
    const { data, error } = await NC.sb.functions.invoke("nc-admin", { body });
    if (error) { let m = error.message; try { const j = await error.context.json(); m = j.error || m; } catch (x) {} throw new Error(m); }
    return data;
  }

  async function boot() {
    const s = await NC.getProfile();
    if (!s) {
      let has = true; try { has = (await fn({ action: "has_admin" })).has_admin; } catch (x) {}
      if (!has) return firstAdmin();
      return NC.renderLogin(root, { title: "Gerenciador Nexcube 3D", subtitle: "Acesso administrativo", onDone: boot });
    }
    if (!s.profile || s.profile.role !== "superadmin") {
      if (s.profile && s.profile.role === "client") { location.href = "/painel/"; return; }
      root.innerHTML = `<div class="auth"><div class="auth-card" style="text-align:center"><div style="font-size:2.2rem">🔒</div><h1>Sem permissão</h1><p class="muted">Esta área é exclusiva da administração Nexcube 3D.</p><button class="btn block" style="margin-top:1rem" id="out">Sair</button></div></div>`;
      NC.$("#out").onclick = async () => { await NC.sb.auth.signOut(); boot(); };
      return;
    }
    S.me = s; shell(); addEventListener("hashchange", route); route(); idleGuard();
  }

  /* Sai sozinho após 30 minutos sem uso */
  let idleT;
  function idleGuard() {
    const reset = () => { clearTimeout(idleT); idleT = setTimeout(async () => { await NC.sb.auth.signOut(); NC.toast("Sessão encerrada por inatividade."); location.hash = ""; boot(); }, 30 * 60 * 1000); };
    ["click", "keydown", "touchstart", "scroll"].forEach((ev) => addEventListener(ev, reset, { passive: true })); reset();
  }

  /* Primeiro acesso: cria o administrador principal (só funciona enquanto não existe nenhum) */
  function firstAdmin() {
    root.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="auth-brand"><img src="/assets/logo-cube.png" alt=""><div><b>NEX<span>CUBE</span> 3D</b><small>Primeiro acesso</small></div></div>
      <h1>Criar administrador</h1><p class="muted small">Esta tela aparece só uma vez, antes de existir um administrador.</p>
      <form id="fF" class="stack" style="margin-top:1rem">
        <label>Seu nome<input name="name" required></label>
        <label>Telefone (WhatsApp)<input name="phone" type="tel" inputmode="tel" required placeholder="(41) 99999-9999"></label>
        <label>Repita o telefone<input name="phone2" type="tel" inputmode="tel" required></label>
        ${NC.pinInput("pin", "Crie um PIN de 4 números")}${NC.pinInput("pin2", "Repita o PIN")}
        <button class="btn primary block">Criar e entrar</button></form></div></div>`;
    const f = NC.$("#fF"); NC.maskPhone(f.phone); NC.maskPhone(f.phone2);
    f.onsubmit = async (ev) => {
      ev.preventDefault(); const ok = NC.checkPhonePin(f); if (!ok) return;
      const btn = NC.$("button", f); btn.disabled = true;
      try {
        await fn({ action: "bootstrap_admin", name: f.name.value.trim(), phone: ok.phone, pin: ok.pin });
        const { error } = await NC.sb.auth.signInWithPassword(NC.authFromPhone(ok.phone, ok.pin)); if (error) throw error;
        NC.toast("Administrador criado!"); boot();
      } catch (err) { NC.err(err); btn.disabled = false; }
    };
  }

  function shell() {
    root.innerHTML = `
    <div class="mtop"><button class="icon-btn" id="mOpen" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.2)" aria-label="Menu">${ic("menuBars")}</button><b>Nexcube 3D · ADM</b><img src="/assets/logo-cube.png" alt=""></div>
    <div class="app">
      <aside class="side" id="side">
        <div class="brand"><img src="/assets/logo-cube.png" alt=""><div><b>NEX<span>CUBE</span> 3D</b><small>GERENCIADOR</small></div></div>
        ${NAV.map((n) => `<a class="nav-a" href="#${n.id}" data-nav="${n.id}">${ic(n.icon)} ${n.label}</a>`).join("")}
        <div class="spacer"></div>
        <a class="nav-a" href="/" target="_blank">${ic("globe")} Ver site</a>
        <button class="nav-a" id="chPin">${ic("lock")} Trocar meu PIN</button>
        <button class="nav-a" id="logout">${ic("logout")} Sair</button>
        <div class="who">${e(S.me.profile.full_name || "")} · ${e(NC.fmtPhone(NC.userPhone(S.me.user)))}</div>
      </aside>
      <main class="main" id="view"></main>
    </div>`;
    NC.$("#logout").onclick = async () => { await NC.sb.auth.signOut(); location.hash = ""; boot(); };
    NC.$("#chPin").onclick = () => NC.changePin(NC.userPhone(S.me.user));
    NC.$("#mOpen").onclick = (ev) => { ev.stopPropagation(); NC.$("#side").classList.toggle("open"); };
    document.addEventListener("click", (ev) => { const sd = NC.$("#side"); if (sd && sd.classList.contains("open") && !sd.contains(ev.target)) sd.classList.remove("open"); });
  }

  function route() {
    if (location.hash === "#dash-chart") { const el = NC.$("#dash-chart"); if (el) el.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", "#dashboard"); return; }
    const [id, arg] = (location.hash.replace("#", "") || "dashboard").split("/");
    NC.$$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === (id === "cliente" ? "clientes" : id)));
    NC.$("#side") && NC.$("#side").classList.remove("open");
    const v = NC.$("#view"); v.innerHTML = `<div class="center-msg"><div class="spin dark"></div></div>`; window.scrollTo(0, 0);
    const views = { dashboard, clientes, cliente: () => cliente(v, arg), tags, minisites, config };
    (views[id] || dashboard)(v, arg);
  }

  const loadCustomers = async () => { const { data, error } = await NC.sb.from("nc_customers").select("*").order("company_name"); if (error) NC.err(error); S.customers = data || []; return S.customers; };
  const loadTags = async () => { const { data, error } = await NC.sb.from("nc_tags").select("*").order("created_at", { ascending: false }); if (error) NC.err(error); S.tags = data || []; return S.tags; };
  const custName = (id) => (S.customers.find((c) => c.id === id) || {}).company_name || "—";

  /* ======================= DASHBOARD ======================= */
  async function dashboard(v) {
    let days = 30;
    const draw = async () => {
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const [cs, ts, ev, rq, au] = await Promise.all([
        loadCustomers(), loadTags(),
        NC.sb.from("nc_events").select("event_type,tag_id,created_at,ua_category").gte("created_at", since).limit(50000),
        NC.sb.from("nc_minisite_requests").select("id,status"),
        NC.sb.from("nc_audit_logs").select("*").order("created_at", { ascending: false }).limit(15)
      ]);
      const events = (ev.data || []).filter((x) => x.ua_category !== "bot");
      const views = events.filter((x) => x.event_type === "view"), clicks = events.filter((x) => x.event_type === "click"), scans = events.filter((x) => x.event_type === "redirect");
      const byTag = {}; scans.forEach((x) => (byTag[x.tag_id] = (byTag[x.tag_id] || 0) + 1));
      const top = Object.entries(byTag).map(([id, n]) => ({ t: ts.find((t) => t.id === id), n })).filter((x) => x.t).sort((a, b) => b.n - a.n).slice(0, 6);
      const maxN = Math.max(1, ...top.map((x) => x.n));
      const reqOpen = (rq.data || []).filter((r) => !["published", "cancelled"].includes(r.status)).length;
      v.innerHTML = `
      <div class="topbar"><div><h1>Dashboard</h1><p class="muted">Visão geral da plataforma Nexcube 3D</p></div>
        <div class="row"><select id="per" style="width:auto"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select>
        <a class="btn primary" href="#clientes/novo">${ic("plus", 18)} Novo cliente</a></div></div>
      <div class="quick">
        <a href="#clientes/novo" class="qa primary">${ic("plus", 22)}<b>Novo cliente</b><small>Cadastro + login + tag</small></a>
        <a href="#tags/nova" class="qa">${ic("tag", 22)}<b>Criar tags</b><small>Gerar códigos e QR</small></a>
        <a href="#clientes" class="qa">${ic("users", 22)}<b>Clientes</b><small>Gerenciar páginas</small></a>
        <a href="#minisites" class="qa">${ic("rocket", 22)}<b>Mini sites</b><small>Solicitações</small></a>
      </div>
      <div class="cards">
        <a class="kpi click" href="#clientes"><span>${ic("users", 16)} Clientes</span><b>${cs.length}</b><small>${cs.filter((c) => c.status === "active").length} ativos · ${cs.filter((c) => c.status === "pending").length} pendentes</small><i class="go">${ic("down", 16)}</i></a>
        <a class="kpi click" href="#tags"><span>${ic("tag", 16)} Tags</span><b>${ts.length}</b><small>${ts.filter((t) => t.status === "active" && t.customer_id).length} ativas e vinculadas</small><i class="go">${ic("down", 16)}</i></a>
        <a class="kpi click" href="#minisites"><span>${ic("rocket", 16)} Mini sites</span><b>${reqOpen}</b><small>solicitações em aberto</small><i class="go">${ic("down", 16)}</i></a>
        <a class="kpi click" href="#tags"><span>${ic("nfc", 16)} Leituras</span><b>${scans.length}</b><small>tags lidas no período</small><i class="go">${ic("down", 16)}</i></a>
        <a class="kpi click" href="#dash-chart"><span>${ic("eye", 16)} Visualizações</span><b>${views.length}</b><small>${clicks.length} cliques em links</small><i class="go">${ic("down", 16)}</i></a>
      </div>
      <div class="split section">
        <div class="card" id="dash-chart"><h3>Acessos às páginas por dia</h3><div id="ch"></div></div>
        <div class="card"><div class="row between" style="margin-bottom:.6rem"><h3 style="margin:0">Tags mais acessadas</h3><a class="small" href="#tags">Ver tags →</a></div>${top.length ? `<div class="hbar">${top.map((x) => `<span><span class="code">${e(x.t.code)}</span> ${e(custName(x.t.customer_id))}</span><b>${x.n}</b><div class="tr"><i style="width:${(x.n / maxN) * 100}%"></i></div>`).join("")}</div>` : `<div class="empty">Sem leituras no período.</div>`}</div>
      </div>
      <div class="card"><div class="row between" style="margin-bottom:.6rem"><h3 style="margin:0">Atividades recentes</h3><a class="small" href="#clientes">Ver clientes →</a></div>${(au.data || []).length ? `<div class="feed">${au.data.map((a) => `<div><span class="dot">${ic(ACT_IC[a.action] || "sparkle", 16)}</span><span>${e(ACT[a.action] || a.action)}${a.customer_id ? ` · <a href="#cliente/${a.customer_id}">${e(custName(a.customer_id))}</a>` : ""}${a.metadata && a.metadata.code ? ` · <span class="code">${e(a.metadata.code)}</span>` : ""}<small>${NC.fmtDateTime(a.created_at)}</small></span></div>`).join("")}</div>` : `<div class="empty">Nenhuma atividade ainda.</div>`}</div>`;
      NC.$("#per").value = days; NC.$("#per").onchange = (x) => { days = +x.target.value; draw(); };
      NC.barChart(NC.$("#ch"), NC.daySeries(views.concat(scans), days), "acessos");
    };
    draw();
  }

  /* ======================= CLIENTES ======================= */
  async function clientes(v, arg) {
    await Promise.all([loadCustomers(), loadTags()]);
    let q = "", fs = "";
    v.innerHTML = `<div class="topbar"><div><h1>Clientes</h1><p class="muted">${S.customers.length} cadastrados</p></div><button class="btn primary" id="new">${ic("plus", 18)} Novo cliente</button></div>
      <div class="toolbar"><div class="search">${ic("search", 18)}<input id="q" placeholder="Buscar por empresa, responsável, e-mail..."></div>
        <select id="fs"><option value="">Todos os status</option><option value="active">Ativos</option><option value="pending">Pendentes</option><option value="suspended">Suspensos</option></select></div>
      <div class="tbl-wrap resp"><table><thead><tr><th>Empresa</th><th>Responsável</th><th>Contato</th><th>Tags</th><th>Mini site</th><th>Status</th><th>Cadastro</th></tr></thead><tbody id="tb"></tbody></table></div>`;
    const draw = () => {
      const L = S.customers.filter((c) => (!fs || c.status === fs) && (!q || [c.company_name, c.contact_name, c.phone, c.public_slug].join(" ").toLowerCase().includes(q)));
      NC.$("#tb").innerHTML = L.length ? L.map((c) => `<tr class="click" data-id="${c.id}"><td class="full" data-label="Empresa"><b>${e(c.company_name)}</b><div class="muted tiny">/${e(c.public_slug)}</div></td><td data-label="Responsável">${e(c.contact_name || "—")}</td>
        <td class="small" data-label="Login">${e(NC.fmtPhone(c.phone || "") || "—")}<div class="muted">${c.owner_user_id ? "com login" : "sem login"}</div></td><td data-label="Tags">${S.tags.filter((t) => t.customer_id === c.id).length}</td>
        <td data-label="Mini site">${badge(MS, c.minisite_status)}</td><td data-label="Status">${badge(ST, c.status)}</td><td class="small" data-label="Cadastro">${NC.fmtDate(c.created_at)}</td></tr>`).join("")
        : `<tr><td colspan="7"><div class="empty">${ic("users", 34)}Nenhum cliente encontrado.</div></td></tr>`;
      NC.$$("#tb tr[data-id]").forEach((tr) => (tr.onclick = () => (location.hash = "cliente/" + tr.dataset.id)));
    };
    NC.$("#q").oninput = (x) => { q = x.target.value.toLowerCase(); draw(); };
    NC.$("#fs").onchange = (x) => { fs = x.target.value; draw(); };
    NC.$("#new").onclick = () => customerForm();
    draw();
    if (arg === "novo") { history.replaceState(null, "", "#clientes"); customerForm(); }
  }

  function customerForm(c) {
    const isNew = !c; c = c || { status: "active", primary_color: "#7a3cff", bg_color: "#0f0e1a" };
    NC.modal({
      title: isNew ? "Novo cliente" : "Editar cliente", wide: true,
      body: `<form class="stack" id="fC">
        <div class="grid2"><label>Empresa ou profissional *<input name="company_name" required maxlength="120" value="${e(c.company_name || "")}"></label>
          <label>Responsável<input name="contact_name" value="${e(c.contact_name || "")}"></label></div>
        ${isNew ? `<div class="card" style="box-shadow:none;background:var(--soft)"><h3 style="margin-bottom:.4rem">${ic("lock")} Login do cliente no painel</h3>
          <p class="muted small" style="margin-bottom:.8rem">O cliente entra em <b>/painel</b> com o telefone e o PIN de 4 números. Digite duas vezes para não errar.</p>
          <div class="grid2"><label>Telefone (WhatsApp) *<input name="phone" type="tel" inputmode="tel" required placeholder="(41) 99999-9999"></label>
            <label>Repita o telefone *<input name="phone2" type="tel" inputmode="tel" required></label></div>
          <div class="grid2" style="margin-top:.8rem">${NC.pinInput("pin", "PIN de 4 números *")}${NC.pinInput("pin2", "Repita o PIN *")}</div></div>`
        : `<p class="muted small">Login do cliente: <b>${e(NC.fmtPhone(c.phone || ""))}</b> · para trocar telefone ou PIN use “Acesso do cliente” no Resumo.</p>`}
        <div class="grid3"><label>CNPJ <small>(opcional)</small><input name="document" value="${e(c.document || "")}"></label>
          <label>Segmento<input name="segment" value="${e(c.segment || "")}" placeholder="Ex.: restaurante"></label>
          <label>Status<select name="status"><option value="active">Ativo (acesso liberado)</option><option value="pending">Pendente</option><option value="suspended">Suspenso</option></select></label></div>
        <label>Endereço <small>(opcional)</small><input name="address" value="${e(c.address || "")}"></label>
        <label>Endereço da página pública *<div class="input-group"><span>nexcube3d.com.br/</span><input name="public_slug" required pattern="[a-z0-9]([a-z0-9\\-]{0,48}[a-z0-9])?" value="${e(c.public_slug || "")}" placeholder="nomedaempresa"></div>
          <small id="slugMsg">Só letras minúsculas, números e hífen. É o endereço que aparece para os visitantes.</small></label>
        <div class="grid2"><label>Cor principal<input type="color" name="primary_color" value="${e(c.primary_color)}"></label><label>Cor de fundo<input type="color" name="bg_color" value="${e(c.bg_color)}"></label></div>
        <label>Logo <small>(opcional, até 2 MB)</small><input type="file" name="logo" accept="image/png,image/jpeg,image/webp"></label>
        <label>Observações internas <small>(só a Nexcube vê)</small><textarea name="notes" placeholder="Anotações sobre o cliente">${e(c._notes || "")}</textarea></label>
        ${isNew ? `<label class="row" style="font-weight:600"><input type="checkbox" name="mktag" checked> Já criar uma tag (NFC + QR Code) para este cliente</label>
          <label class="row" style="font-weight:600"><input type="checkbox" name="mkwa" checked> Já criar o botão "Fale no WhatsApp" com o telefone do cliente</label>` : ""}
      </form>`,
      onOpen: (w) => {
        const f = NC.$("#fC", w); f.status.value = c.status;
        if (isNew) { NC.maskPhone(f.phone); NC.maskPhone(f.phone2); }
        let touched = !isNew, tmr;
        const msg = NC.$("#slugMsg", w);
        const check = async () => {
          const sl = NC.slugify(f.public_slug.value); if (!sl) { msg.textContent = "Informe o endereço."; msg.style.color = "var(--bad)"; return false; }
          if (sl !== f.public_slug.value) f.public_slug.value = sl;
          const { data } = await NC.sb.rpc("nc_slug_free", { p_slug: sl, p_except: c.id || null });
          if (data) { msg.innerHTML = "✓ Disponível: " + e(NC.publicUrl(sl)); msg.style.color = "var(--ok)"; return true; }
          let alt = sl, i = 2; while (i < 30) { const t = `${sl.slice(0, 46)}-${i}`; const r = await NC.sb.rpc("nc_slug_free", { p_slug: t, p_except: c.id || null }); if (r.data) { alt = t; break; } i++; }
          msg.innerHTML = `✗ Esse endereço já está em uso. <button type="button" class="link-btn" id="useAlt">Usar “${e(alt)}”</button>`; msg.style.color = "var(--bad)";
          NC.$("#useAlt", w).onclick = () => { f.public_slug.value = alt; check(); };
          return false;
        };
        f._checkSlug = check;
        const later = () => { clearTimeout(tmr); tmr = setTimeout(check, 450); };
        f.public_slug.addEventListener("input", () => { touched = true; later(); });
        if (isNew) f.company_name.addEventListener("input", () => { if (!touched) { f.public_slug.value = NC.slugify(f.company_name.value); later(); } });
      },
      actions: [{ label: "Cancelar", cls: "ghost" }, {
        label: isNew ? "Cadastrar cliente" : "Salvar", cls: "primary", onClick: async (w) => {
          const f = NC.$("#fC", w); if (!f.reportValidity()) return false;
          let acc = null; if (isNew) { acc = NC.checkPhonePin(f); if (!acc) return false; }
          if (!(await f._checkSlug())) { NC.toast("Escolha um endereço de página disponível.", "err"); return false; }
          const row = {};
          ["company_name", "contact_name", "document", "segment", "address", "status", "primary_color", "bg_color"].forEach((k) => (row[k] = f[k].value.trim() || null));
          row.public_slug = NC.slugify(f.public_slug.value);
          if (acc) row.phone = acc.phone;
          // 1) salva o cadastro (se já foi salvo numa tentativa anterior, só atualiza)
          let saved;
          try {
            const targetId = c.id || w._createdId;
            const r = targetId ? await NC.sb.from("nc_customers").update(row).eq("id", targetId).select().single()
                               : await NC.sb.from("nc_customers").insert(row).select().single();
            if (r.error) throw r.error; saved = r.data; if (isNew) w._createdId = saved.id;
          } catch (err) { NC.err(err); return false; }
          const warn = [];
          // 2) logo (opcional — se falhar, o cadastro continua)
          if (f.logo.files[0]) {
            try { const p = await NC.uploadImage(saved.id, f.logo.files[0], "logo"); const u = await NC.sb.from("nc_customers").update({ logo_path: p }).eq("id", saved.id); if (u.error) throw u.error; }
            catch (err) { warn.push("a logo não foi enviada (" + (err.message || "erro") + ")"); }
          }
          // 3) observações
          await NC.sb.from("nc_customer_notes").upsert({ customer_id: saved.id, notes: f.notes.value.trim() || null, updated_at: new Date().toISOString() });
          // 4) tag
          if (isNew && f.mktag && f.mktag.checked && !w._tagDone) { const r = await NC.sb.from("nc_tags").insert({ customer_id: saved.id, label: "Tag principal", tag_type: "nfc_qr" }); if (r.error) warn.push("a tag não foi criada"); else w._tagDone = true; }
          // 4b) primeiro botão da página (WhatsApp), para a página não nascer vazia
          if (isNew && acc && f.mkwa && f.mkwa.checked && !w._waDone) { const r = await NC.sb.from("nc_links").insert({ customer_id: saved.id, title: "Fale no WhatsApp", url: NC.waLink(acc.phone, "Olá! Vim pela sua página."), link_type: "whatsapp", sort_order: 0 }); if (!r.error) w._waDone = true; }
          // 5) login (telefone + PIN)
          if (acc) { try { await fn({ action: "set_client_access", customer_id: saved.id, phone: acc.phone, pin: acc.pin }); } catch (err) { warn.push("o login não foi criado: " + err.message); } }
          if (warn.length) NC.toast("Cliente salvo, mas " + warn.join("; ") + ". Ajuste na ficha do cliente.", "err");
          else NC.toast(isNew ? "Cliente cadastrado com login!" : "Cliente atualizado!");
          location.hash = "cliente/" + saved.id; if (!isNew) route();
        }
      }]
    });
  }

  /* ======================= DETALHE DO CLIENTE ======================= */
  async function cliente(v, id) {
    await loadCustomers();
    const c = S.customers.find((x) => x.id === id);
    if (!c) { v.innerHTML = `<div class="card empty">Cliente não encontrado. <a href="#clientes">Voltar</a></div>`; return; }
    const [tg, lk, nt, rq] = await Promise.all([
      NC.sb.from("nc_tags").select("*").eq("customer_id", id).order("created_at"),
      NC.sb.from("nc_links").select("*").eq("customer_id", id).order("sort_order"),
      NC.sb.from("nc_customer_notes").select("*").eq("customer_id", id).maybeSingle(),
      NC.sb.from("nc_minisite_requests").select("*").eq("customer_id", id).order("created_at", { ascending: false })
    ]);
    const st = { links: lk.data || [], tags: tg.data || [] };
    c._notes = nt.data ? nt.data.notes : "";
    let tab = sessionStorage.getItem("nc-tab") || "resumo";
    v.innerHTML = `
      <div class="topbar"><div><a href="#clientes" class="small">← Clientes</a><h1>${e(c.company_name)} ${badge(ST, c.status)}</h1><p class="muted small">${e(NC.publicUrl(c.public_slug))}</p></div>
        <div class="row"><a class="btn" target="_blank" rel="noopener" href="${e(NC.publicUrl(c.public_slug))}">${ic("eye", 18)} Ver página</a>
          <button class="btn" id="edit">${ic("edit", 18)} Editar</button>
          <button class="icon-btn danger" id="delC" title="Excluir cliente">${ic("trash", 18)}</button>
          ${c.status !== "active" ? `<button class="btn primary" data-st="active">${ic("check", 18)} ${c.status === "pending" ? "Liberar acesso" : "Reativar"}</button>` : `<button class="btn" data-st="suspended" style="color:var(--bad)">Suspender</button>`}</div></div>
      <div class="tabs">${[["resumo", "Resumo"], ["tags", "Tags (" + st.tags.length + ")"], ["pagina", "Perfil público"], ["minisite", "Mini site"], ["stats", "Estatísticas"], ["hist", "Histórico"]].map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join("")}</div>
      <div id="tabv"></div>`;
    NC.$("#edit").onclick = () => customerForm(c);
    NC.$("#delC").onclick = async () => {
      if (!(await NC.confirm("Excluir cliente", `Excluir "${c.company_name}" definitivamente? A página, os links e as estatísticas serão apagados. As tags voltam para o estoque (sem cliente). Não pode ser desfeito.`, "Excluir"))) return;
      if (c.owner_user_id) { try { await fn({ action: "remove_access", customer_id: c.id }); } catch (x) {} }
      const u = await NC.sb.from("nc_tags").update({ customer_id: null, destination_type: "links", custom_url: null }).eq("customer_id", c.id);
      if (u.error) return NC.err(u.error);
      const d = await NC.sb.from("nc_customers").delete().eq("id", c.id);
      if (d.error) return NC.err(d.error);
      NC.toast("Cliente excluído."); location.hash = "clientes";
    };
    NC.$$("[data-st]").forEach((b) => (b.onclick = async () => {
      const to = b.dataset.st;
      if (to === "suspended" && !(await NC.confirm("Suspender cliente", "As tags do cliente serão suspensas e a página pública ficará indisponível. Deseja continuar?", "Suspender"))) return;
      const { error } = await NC.sb.from("nc_customers").update({ status: to }).eq("id", c.id);
      if (error) return NC.err(error);
      if (to === "active") NC.toast(c.status === "suspended" ? "Cliente reativado. Reative as tags na aba Tags." : "Acesso liberado!"); else NC.toast("Cliente suspenso.");
      route();
    }));
    const T = NC.$("#tabv");
    const show = (k) => {
      tab = k; sessionStorage.setItem("nc-tab", k);
      NC.$$("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === k));
      ({ resumo: tResumo, tags: tTags, pagina: tPagina, minisite: tMinisite, stats: () => ED.stats(T, c, st.tags, st.links), hist: tHist })[k]();
    };
    NC.$$("[data-tab]").forEach((b) => (b.onclick = () => show(b.dataset.tab)));

    function tResumo() {
      T.innerHTML = `<div class="split">
        <div class="stack">
          <div class="card"><h3>Dados do cliente</h3><div class="grid2 small">
            <div><span class="muted">Responsável</span><br><b>${e(c.contact_name || "—")}</b></div><div><span class="muted">Login (telefone)</span><br><b>${e(NC.fmtPhone(c.phone || "") || "—")}</b></div>
            <div><span class="muted">Painel</span><br><b>${c.owner_user_id ? "Com acesso" : "Sem acesso"}</b></div><div><span class="muted">CNPJ</span><br><b>${e(c.document || "—")}</b></div>
            <div><span class="muted">Segmento</span><br><b>${e(c.segment || "—")}</b></div><div><span class="muted">Cadastro</span><br><b>${NC.fmtDate(c.created_at)}</b></div></div>
            ${c.address ? `<p class="small" style="margin-top:.8rem"><span class="muted">Endereço:</span> ${e(c.address)}</p>` : ""}</div>
          <div class="card stack"><h3 style="margin:0">Página pública</h3>
            <div class="url-line"><span>${e(NC.publicUrl(c.public_slug))}</span><button class="icon-btn" id="cpP">${ic("copy", 18)}</button></div>
            <p class="muted small">Tags: ${st.tags.length ? st.tags.map((t) => `<span class="code">${e(t.code)}</span> → ${ED.DEST_LABEL[t.destination_type]}`).join(" · ") : "nenhuma"}</p></div>
          <div class="card"><h3>Observações internas</h3><textarea id="notes" placeholder="Só a Nexcube vê">${e(c._notes || "")}</textarea><button class="btn sm" style="margin-top:.6rem" id="svN">Salvar observações</button></div>
        </div>
        <div class="card stack"><h3 style="margin:0">${ic("lock")} Acesso do cliente ao painel</h3>
          ${c.owner_user_id ? `<p class="alert ok small">${ic("check", 18)}<span>Login: <b>${e(NC.fmtPhone(c.phone || ""))}</b> + PIN. ${c.status === "active" ? "O cliente já pode entrar em <b>/painel</b>." : "O painel só abre quando o cliente estiver <b>ativo</b>."}</span></p>`
            : `<p class="alert warn small">${ic("lock", 18)}<span>Este cliente ainda não tem login.</span></p>`}
          <form class="stack" id="fAcc">
            <div class="grid2"><label>Telefone (WhatsApp)<input name="phone" type="tel" inputmode="tel" required value="${e(NC.fmtPhone(c.phone || ""))}"></label>
              <label>Repita o telefone<input name="phone2" type="tel" inputmode="tel" required></label></div>
            <div class="grid2">${NC.pinInput("pin", c.owner_user_id ? "Novo PIN" : "PIN de 4 números")}${NC.pinInput("pin2", "Repita o PIN")}</div>
            <button class="btn primary">${ic("check", 18)} ${c.owner_user_id ? "Salvar novo telefone/PIN" : "Criar login do cliente"}</button>
          </form>
          ${c.owner_user_id ? `<button class="btn ghost" id="rmAcc" style="color:var(--bad)">Remover acesso</button>` : ""}
          ${c.phone ? `<a class="btn" target="_blank" rel="noopener" id="waAcc" href="#">${ic("whatsapp", 18)} Enviar instruções de acesso no WhatsApp</a>` : ""}
          <p class="muted tiny">Endereço do painel do cliente: ${e(C.site)}/painel</p>
        </div></div>`;
      NC.$("#cpP").onclick = () => NC.copy(NC.publicUrl(c.public_slug));
      NC.$("#svN").onclick = async () => { const { error } = await NC.sb.from("nc_customer_notes").upsert({ customer_id: c.id, notes: NC.$("#notes").value.trim() || null, updated_at: new Date().toISOString() }); if (error) return NC.err(error); NC.toast("Observações salvas."); };
      const fa = NC.$("#fAcc"); NC.maskPhone(fa.phone); NC.maskPhone(fa.phone2);
      fa.onsubmit = async (ev) => {
        ev.preventDefault(); const ok = NC.checkPhonePin(fa); if (!ok) return;
        const btn = NC.$("button", fa); btn.disabled = true;
        try { await fn({ action: "set_client_access", customer_id: c.id, phone: ok.phone, pin: ok.pin }); NC.toast(c.owner_user_id ? "Telefone/PIN atualizados!" : "Login do cliente criado!"); route(); }
        catch (err) { NC.err(err); btn.disabled = false; }
      };
      const wa = NC.$("#waAcc"); if (wa) { const first = (c.contact_name || c.company_name || "").split(" ")[0];
        wa.href = NC.waLink(c.phone, `Olá ${first}! 👋\nSeu painel da Nexcube 3D está pronto.\n\nAcesse: ${C.site}/painel\nEntre com este telefone e o PIN de 4 números que combinamos.\n\nLá você edita sua página, seus links e o destino da sua tag.`); }
      const ra = NC.$("#rmAcc"); if (ra) ra.onclick = async () => { if (!(await NC.confirm("Remover acesso", "O cliente não conseguirá mais entrar no painel até um novo acesso ser criado.", "Remover"))) return; try { await fn({ action: "remove_access", customer_id: c.id }); NC.toast("Acesso removido."); route(); } catch (err) { NC.err(err); } };
    }

    function tTags() {
      T.innerHTML = `<div class="row between section"><p class="muted small">O QR Code e a tag NFC gravam somente o endereço fixo <span class="code">${e(C.site)}/r/CÓDIGO</span>.</p>
        <button class="btn primary" id="nt">${ic("plus", 18)} Nova tag</button></div><div class="stack" id="tl"></div>`;
      NC.$("#nt").onclick = () => tagCreate(c.id);
      const L = NC.$("#tl");
      if (!st.tags.length) { L.innerHTML = `<div class="card empty">${ic("tag", 34)}Nenhuma tag vinculada.</div>`; return; }
      st.tags.forEach((t) => {
        const box = document.createElement("div"); L.appendChild(box);
        ED.tagCard(box, t, c, {});
        const bar = document.createElement("div"); bar.className = "row"; bar.style.cssText = "margin:-.4rem 0 .4rem;padding:0 .3rem";
        bar.innerHTML = `<span class="muted small grow">Último acesso: ${NC.fmtDateTime(t.last_access_at)} · criada em ${NC.fmtDate(t.created_at)}</span>
          <button class="btn sm" data-a="edit">${ic("edit", 16)} Apelido/tipo</button>
          <button class="btn sm" data-a="move">${ic("users", 16)} Alterar cliente</button>
          <button class="btn sm" data-a="st">${t.status === "active" ? "Suspender" : "Ativar"}</button>
          <button class="icon-btn danger" data-a="del" title="Excluir tag">${ic("trash", 18)}</button>`;
        box.appendChild(bar);
        NC.$('[data-a="edit"]', bar).onclick = () => tagEdit(t);
        NC.$('[data-a="move"]', bar).onclick = () => tagMove(t);
        NC.$('[data-a="st"]', bar).onclick = () => tagStatus(t);
        NC.$('[data-a="del"]', bar).onclick = () => { S.customers = S.customers.length ? S.customers : [c]; tagDelete(t); };
      });
    }

    function tPagina() {
      T.innerHTML = `<div class="alert info section">${ic("eye", 18)}<span>Você está editando a página como administrador. O cliente vê as mesmas alterações no painel dele.</span></div>
        <div class="tabs" style="border:0"><button data-sub="perfil" class="on">Perfil</button><button data-sub="links">Links</button><button data-sub="ap">Aparência</button></div>
        <div class="split"><div id="ed"></div><div class="preview-col"><div class="phone-frame"><div class="pv" id="pv"></div></div></div></div>`;
      const refresh = () => NC.renderPublic(NC.$("#pv"), ED.previewData(c, st.links), { preview: true });
      const sub = (k) => {
        NC.$$("[data-sub]").forEach((b) => b.classList.toggle("on", b.dataset.sub === k));
        const ed = NC.$("#ed");
        if (k === "perfil") ED.profile(ed, c, { onChange: refresh, onSaved: refresh });
        if (k === "links") ED.links(ed, c, st, { onChange: refresh });
        if (k === "ap") ED.appearance(ed, c, { onChange: refresh, onSaved: refresh });
      };
      NC.$$("[data-sub]").forEach((b) => (b.onclick = () => sub(b.dataset.sub)));
      sub("perfil"); refresh();
    }

    async function tMinisite() {
      const reqs = rq.data || [];
      const { data: md } = await NC.sb.from("nc_settings").select("value").eq("key", "minisite_models").maybeSingle();
      const pub = c.minisite_status === "published" && c.minisite_url;
      T.innerHTML = `
        <div class="ms-steps">
          <div class="${pub ? "done" : "on"}"><b>1</b><span>Mostrar modelos</span></div>
          <div class="${pub ? "done" : c.minisite_status !== "none" ? "on" : ""}"><b>2</b><span>Contratar com a DDS</span></div>
          <div class="${pub ? "done" : ""}"><b>3</b><span>Colar o link e publicar</span></div>
        </div>
        ${pub ? `<div class="card section ms-live"><span class="badge ok">${ic("check", 14)} Mini site publicado</span>
            <div class="url-line" style="margin-top:.7rem"><span>${e(c.minisite_url)}</span><a class="icon-btn" href="${e(c.minisite_url)}" target="_blank" rel="noopener">${ic("eye", 18)}</a></div>
            <p class="muted small" style="margin-top:.5rem">O cliente já pode apontar a tag para o mini site em Minha tag.</p></div>`
          : `<div class="card section">${ED.showcase(md ? md.value : [], c, { admin: true })}</div>`}
        <div class="split">
          <div class="card stack"><h3 style="margin:0">${ic("rocket")} ${pub ? "Dados do mini site" : "Cliente contratou? Cole o link aqui"}</h3>
            <label>Situação<select id="msS"><option value="none">Não contratado</option><option value="requested">Interessado / em negociação</option><option value="in_progress">Contratado, em desenvolvimento</option><option value="published">Publicado</option></select></label>
            <label>Link do mini site<input id="msU" placeholder="https://..." value="${e(c.minisite_url || "")}" inputmode="url"></label>
            <p class="muted small">Ao colar o link, a situação muda para <b>Publicado</b> e o cliente poderá apontar a tag para o mini site.</p>
            <div><button class="btn primary" id="msSave">${ic("check", 18)} Salvar</button></div></div>
          <div class="card"><h3>Solicitações do cliente</h3>${reqs.length ? `<div class="feed">${reqs.map((r) => `<div><span class="dot">${ic("rocket", 16)}</span><span><b>${e(RQ[r.status])}</b> · ${e(r.business_type || "")}<small>${NC.fmtDateTime(r.created_at)} · <a href="#minisites/${r.id}">abrir</a></small></span></div>`).join("")}</div>` : `<div class="empty">O cliente ainda não pediu pelo painel.</div>`}</div>
        </div>`;
      const sel = NC.$("#msS"), inp = NC.$("#msU");
      sel.value = c.minisite_status;
      inp.addEventListener("input", () => { if (inp.value.trim()) sel.value = "published"; });
      NC.$("#msSave").onclick = async () => {
        const status = sel.value; let url = inp.value.trim();
        if (url) { url = NC.normalizeUrl(url); if (!url) return NC.toast("Link inválido. Use https://", "err"); } else url = null;
        if (status === "published" && !url) return NC.toast("Cole o link do mini site para publicar.", "err");
        const { error } = await NC.sb.from("nc_customers").update({ minisite_status: status, minisite_url: url }).eq("id", c.id);
        if (error) return NC.err(error); c.minisite_status = status; c.minisite_url = url;
        NC.toast(status === "published" ? "Mini site publicado e vinculado ao cliente! 🎉" : "Mini site atualizado."); tMinisite();
      };
    }

    async function tHist() {
      T.innerHTML = `<div class="card"><div class="spin dark"></div></div>`;
      const { data } = await NC.sb.from("nc_audit_logs").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(100);
      T.innerHTML = `<div class="card"><h3>Histórico / auditoria</h3>${(data || []).length ? `<div class="feed">${data.map((a) => `<div><span class="dot">${ic(ACT_IC[a.action] || "sparkle", 16)}</span><span>${e(ACT[a.action] || a.action)} ${a.metadata && Object.keys(a.metadata).length ? `<span class="muted small">${e(JSON.stringify(a.metadata).slice(0, 140))}</span>` : ""}<small>${NC.fmtDateTime(a.created_at)}</small></span></div>`).join("")}</div>` : `<div class="empty">Sem registros.</div>`}</div>`;
    }
    show(tab);
  }

  function showLink(link, c) {
    const first = (c.contact_name || c.company_name || "").split(" ")[0];
    const msg = `Olá ${first}! 👋\nSeu painel da Nexcube 3D está pronto.\n\nToque no link abaixo para criar sua senha e começar a editar sua página:\n${link}\n\nDepois, acesse sempre por: ${C.site}/painel`;
    NC.modal({
      title: "Link de acesso gerado",
      body: `<div class="stack"><p class="alert ok small">${ic("check", 18)}<span>Envie este link ao cliente. Ele vale para <b>um único uso</b> e expira em 24 horas.</span></p>
        <div class="url-line"><span style="font-size:.75rem">${e(link)}</span></div>
        <button class="btn" id="cpl">${ic("copy", 18)} Copiar link</button>
        ${c.phone ? `<a class="btn primary" target="_blank" rel="noopener" href="${NC.waLink(c.phone, msg)}">${ic("whatsapp", 18)} Enviar no WhatsApp do cliente</a>` : `<p class="muted small">Cadastre o telefone do cliente para enviar direto pelo WhatsApp.</p>`}</div>`,
      onOpen: (w) => (NC.$("#cpl", w).onclick = () => NC.copy(msg, "Mensagem com o link copiada!")),
      actions: [{ label: "Fechar", cls: "ghost" }]
    });
  }

  /* ======================= TAGS ======================= */
  function tagCreate(customerId) {
    const opts = S.customers.map((c) => `<option value="${c.id}">${e(c.company_name)}${c.status === "suspended" ? " (suspenso)" : ""}</option>`).join("");
    NC.modal({
      title: "Criar tags",
      body: `<form class="stack" id="fT">
        <p class="muted small">O código é gerado automaticamente, é único e não previsível (ex.: NC-a8F3k2Qx).</p>
        <div class="grid2"><label>Quantidade<input type="number" name="qty" min="1" max="100" value="1"></label>
          <label>Tipo<select name="tag_type"><option value="nfc_qr">NFC + QR Code</option><option value="nfc">Só NFC</option><option value="qr">Só QR Code</option></select></label></div>
        <label>Cliente<select name="customer_id"><option value="">— Sem cliente (estoque) —</option>${opts}</select></label>
        <label>Apelido / identificação interna<input name="label" maxlength="80" placeholder="Ex.: balcão, recepção, cartão do vendedor"></label>
        <label>Status inicial<select name="status"><option value="active">Ativa</option><option value="suspended">Suspensa</option></select></label></form>`,
      onOpen: (w) => { if (customerId) NC.$("[name=customer_id]", w).value = customerId; },
      actions: [{ label: "Cancelar", cls: "ghost" }, {
        label: "Criar", cls: "primary", onClick: async (w) => {
          const f = NC.$("#fT", w); const n = Math.min(100, Math.max(1, +f.qty.value || 1));
          const rows = Array.from({ length: n }, (_, i) => ({ customer_id: f.customer_id.value || null, tag_type: f.tag_type.value, status: f.status.value, label: f.label.value.trim() ? (n > 1 ? `${f.label.value.trim()} ${i + 1}` : f.label.value.trim()) : null }));
          const { error } = await NC.sb.from("nc_tags").insert(rows);
          if (error) { NC.err(error); return false; }
          NC.toast(n > 1 ? `${n} tags criadas!` : "Tag criada!"); route();
        }
      }]
    });
  }
  function tagEdit(t) {
    NC.modal({
      title: "Editar tag " + t.code,
      body: `<form class="stack" id="fE"><label>Apelido<input name="label" maxlength="80" value="${e(t.label || "")}"></label>
        <label>Tipo<select name="tag_type"><option value="nfc_qr">NFC + QR Code</option><option value="nfc">Só NFC</option><option value="qr">Só QR Code</option></select></label></form>`,
      onOpen: (w) => (NC.$("[name=tag_type]", w).value = t.tag_type),
      actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Salvar", cls: "primary", onClick: async (w) => {
        const f = NC.$("#fE", w); const { error } = await NC.sb.from("nc_tags").update({ label: f.label.value.trim() || null, tag_type: f.tag_type.value }).eq("id", t.id);
        if (error) { NC.err(error); return false; } NC.toast("Tag atualizada."); route(); } }]
    });
  }
  function tagMove(t) {
    NC.modal({
      title: "Vincular / alterar cliente",
      body: `<p class="alert warn small">${ic("sparkle", 18)}<span>A tag <b>${e(t.code)}</b> passará a abrir a página do novo cliente. A alteração fica registrada na auditoria.</span></p>
        <label style="margin-top:1rem">Cliente<select id="mv"><option value="">— Sem cliente (desvincular) —</option>${S.customers.filter((c) => c.status !== "suspended").map((c) => `<option value="${c.id}">${e(c.company_name)}</option>`).join("")}</select></label>`,
      onOpen: (w) => (NC.$("#mv", w).value = t.customer_id || ""),
      actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Confirmar alteração", cls: "primary", onClick: async (w) => {
        const to = NC.$("#mv", w).value || null;
        const { error } = await NC.sb.from("nc_tags").update({ customer_id: to, destination_type: "links", custom_url: null }).eq("id", t.id);
        if (error) { NC.err(error); return false; } NC.toast("Tag atualizada."); route(); } }]
    });
  }
  async function tagDelete(t) {
    const msg = t.customer_id
      ? `A tag ${t.code} está vinculada a "${custName(t.customer_id)}". Quem ler essa tag ou o QR Code impresso verá "conteúdo indisponível". O histórico de acessos é mantido sem o vínculo. Não pode ser desfeito.`
      : `Excluir a tag ${t.code} definitivamente? Se ela já foi gravada ou impressa, deixará de funcionar. Não pode ser desfeito.`;
    if (!(await NC.confirm("Excluir tag", msg, "Excluir tag"))) return;
    const { error } = await NC.sb.from("nc_tags").delete().eq("id", t.id);
    if (error) return NC.err(error);
    NC.toast("Tag excluída."); route();
  }
  async function tagStatus(t) {
    const to = t.status === "active" ? "suspended" : "active";
    if (to === "suspended" && !(await NC.confirm("Suspender tag", `Ao suspender, quem ler a tag ${t.code} verá "conteúdo indisponível".`, "Suspender"))) return;
    const { error } = await NC.sb.from("nc_tags").update({ status: to }).eq("id", t.id);
    if (error) return NC.err(error); NC.toast(to === "active" ? "Tag ativada." : "Tag suspensa."); route();
  }
  function tagQrModal(t) {
    NC.modal({
      title: "QR Code " + t.code,
      body: `<div class="stack" style="align-items:center;text-align:center"><div class="qr-box" style="justify-content:center"><div class="qr" style="width:240px;height:240px">${NC.qrSvg(NC.tagUrl(t.code), 480)}</div></div>
        <div class="url-line" style="width:100%"><span>${e(NC.tagUrl(t.code))}</span></div>
        <p class="muted small">Grave na tag NFC exatamente este endereço.</p></div>`,
      onOpen: (w) => { const b = document.createElement("button"); b.className = "btn"; b.innerHTML = ic("nfc", 18) + " Passo a passo de gravação"; b.onclick = () => ED.writeGuide(t.code); NC.$(".modal-b .stack", w).appendChild(b); },
      actions: [{ label: "Copiar endereço", onClick: () => { NC.copy(NC.tagUrl(t.code)); return false; } }, { label: "SVG", onClick: () => { NC.downloadQr(t.code, "svg"); return false; } }, { label: "Baixar PNG", cls: "primary", onClick: () => { NC.downloadQr(t.code, "png"); return false; } }]
    });
  }
  async function tagHistory(t) {
    const { data } = await NC.sb.from("nc_events").select("event_type,created_at,ua_category,referrer_host").eq("tag_id", t.id).order("created_at", { ascending: false }).limit(50);
    NC.modal({ title: "Acessos da tag " + t.code, wide: true,
      body: (data || []).length ? `<div class="tbl-wrap resp"><table><thead><tr><th>Quando</th><th>Evento</th><th>Dispositivo</th><th>Origem</th></tr></thead><tbody>${data.map((x) => `<tr><td>${NC.fmtDateTime(x.created_at)}</td><td>${{ redirect: "Leitura da tag", view: "Visualização", click: "Clique" }[x.event_type]}</td><td>${e(x.ua_category || "—")}</td><td>${e(x.referrer_host || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Nenhum acesso registrado.</div>`,
      actions: [{ label: "Fechar", cls: "ghost" }] });
  }

  async function tags(v, arg) {
    await Promise.all([loadCustomers(), loadTags()]);
    let q = "", fs = "", fv = "";
    v.innerHTML = `<div class="topbar"><div><h1>Tags e QR Codes</h1><p class="muted">${S.tags.length} tags · endereço fixo ${e(C.site)}/r/CÓDIGO</p></div><button class="btn primary" id="nt">${ic("plus", 18)} Criar tags</button></div>
      <div class="toolbar"><div class="search">${ic("search", 18)}<input id="q" placeholder="Buscar código, apelido ou cliente"></div>
        <select id="fs"><option value="">Todos os status</option><option value="active">Ativas</option><option value="suspended">Suspensas</option></select>
        <select id="fv"><option value="">Vinculadas e livres</option><option value="y">Vinculadas</option><option value="n">Sem cliente</option></select></div>
      <div class="tbl-wrap resp"><table><thead><tr><th>Código</th><th>Cliente</th><th>Tipo</th><th>Destino</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody id="tb"></tbody></table></div>`;
    const draw = () => {
      const L = S.tags.filter((t) => (!fs || t.status === fs) && (!fv || (fv === "y" ? t.customer_id : !t.customer_id)) && (!q || [t.code, t.label, custName(t.customer_id)].join(" ").toLowerCase().includes(q)));
      NC.$("#tb").innerHTML = L.length ? L.map((t) => `<tr><td data-label="Código"><span class="code">${e(t.code)}</span><div class="muted tiny">${e(t.label || "")}</div></td>
        <td data-label="Cliente">${t.customer_id ? `<a href="#cliente/${t.customer_id}">${e(custName(t.customer_id))}</a>` : `<span class="muted">— livre —</span>`}</td>
        <td class="small" data-label="Tipo">${ED.TYPE_LABEL[t.tag_type]}</td><td class="small" data-label="Destino">${ED.DEST_LABEL[t.destination_type]}</td>
        <td data-label="Status"><span class="badge ${t.status === "active" ? "ok" : "bad"}">${t.status === "active" ? "Ativa" : "Suspensa"}</span></td>
        <td class="small" data-label="Último acesso">${NC.fmtDateTime(t.last_access_at)}</td>
        <td class="full" data-label="Ações"><div class="row acts">
          <button class="btn sm" title="Como gravar a tag NFC" data-gv="${t.id}">${ic("nfc", 16)} Gravar</button>
          <button class="icon-btn" title="QR Code" data-qr="${t.id}">${ic("download", 18)}</button>
          <button class="icon-btn" title="Copiar URL" data-cp="${t.id}">${ic("copy", 18)}</button>
          <button class="icon-btn" title="Vincular/alterar cliente" data-mv="${t.id}">${ic("users", 18)}</button>
          <button class="icon-btn" title="Editar" data-ed="${t.id}">${ic("edit", 18)}</button>
          <button class="icon-btn" title="Histórico de acessos" data-h="${t.id}">${ic("chart", 18)}</button>
          <button class="btn sm" data-st="${t.id}">${t.status === "active" ? "Suspender" : "Ativar"}</button>
          <button class="icon-btn danger" title="Excluir tag" data-del="${t.id}">${ic("trash", 18)}</button></div></td></tr>`).join("")
        : `<tr><td colspan="7"><div class="empty">${ic("tag", 34)}Nenhuma tag encontrada.</div></td></tr>`;
      const T = (id) => S.tags.find((x) => x.id === id);
      NC.$$("[data-qr]").forEach((b) => (b.onclick = () => tagQrModal(T(b.dataset.qr))));
      NC.$$("[data-gv]").forEach((b) => (b.onclick = () => ED.writeGuide(T(b.dataset.gv).code)));
      NC.$$("[data-cp]").forEach((b) => (b.onclick = () => NC.copy(NC.tagUrl(T(b.dataset.cp).code), "Endereço copiado!")));
      NC.$$("[data-mv]").forEach((b) => (b.onclick = () => tagMove(T(b.dataset.mv))));
      NC.$$("[data-ed]").forEach((b) => (b.onclick = () => tagEdit(T(b.dataset.ed))));
      NC.$$("[data-h]").forEach((b) => (b.onclick = () => tagHistory(T(b.dataset.h))));
      NC.$$("[data-st]").forEach((b) => (b.onclick = () => tagStatus(T(b.dataset.st))));
      NC.$$("[data-del]").forEach((b) => (b.onclick = () => tagDelete(T(b.dataset.del))));
    };
    NC.$("#q").oninput = (x) => { q = x.target.value.toLowerCase(); draw(); };
    NC.$("#fs").onchange = (x) => { fs = x.target.value; draw(); };
    NC.$("#fv").onchange = (x) => { fv = x.target.value; draw(); };
    NC.$("#nt").onclick = () => tagCreate();
    draw();
    if (arg === "nova") { history.replaceState(null, "", "#tags"); tagCreate(); }
  }

  /* ======================= MINI SITES ======================= */
  async function minisites(v, openId) {
    await loadCustomers();
    const { data, error } = await NC.sb.from("nc_minisite_requests").select("*").order("created_at", { ascending: false });
    if (error) NC.err(error);
    const R = data || [];
    v.innerHTML = `<div class="topbar"><div><h1>Solicitações de mini site</h1><p class="muted">Serviço adicional desenvolvido pela DDS Inovação</p></div></div>
      <div class="tbl-wrap resp"><table><thead><tr><th>Cliente</th><th>Data</th><th>Tipo de negócio</th><th>Status</th><th>Responsável</th></tr></thead><tbody>
      ${R.length ? R.map((r) => `<tr class="click" data-id="${r.id}"><td class="full" data-label="Cliente"><b>${e(custName(r.customer_id))}</b></td><td class="small" data-label="Data">${NC.fmtDate(r.created_at)}</td><td data-label="Negócio">${e(r.business_type || "—")}</td>
        <td data-label="Status"><span class="badge ${r.status === "published" ? "ok" : r.status === "cancelled" ? "bad" : "info"}">${e(RQ[r.status])}</span></td><td class="small" data-label="Responsável">${e(r.assigned_to || "—")}</td></tr>`).join("")
        : `<tr><td colspan="5"><div class="empty">${ic("rocket", 34)}Nenhuma solicitação ainda.</div></td></tr>`}</tbody></table></div>`;
    NC.$$("tr[data-id]").forEach((tr) => (tr.onclick = () => reqModal(R.find((r) => r.id === tr.dataset.id))));
    if (openId) { const r = R.find((x) => x.id === openId); if (r) reqModal(r); }
  }
  async function reqModal(r) {
    const c = S.customers.find((x) => x.id === r.customer_id) || {};
    const { data: notes } = await NC.sb.from("nc_minisite_notes").select("*").eq("request_id", r.id).order("created_at");
    const fld = (l, v) => v ? `<div><span class="muted small">${l}</span><p style="white-space:pre-line">${e(v)}</p></div>` : "";
    NC.modal({
      title: "Mini site · " + (c.company_name || ""), wide: true,
      body: `<div class="split"><div class="stack">
          ${fld("Tipo de negócio", r.business_type)}${fld("Objetivo", r.goals)}${fld("Descrição", r.business_description)}${fld("Produtos/serviços", r.services_products)}${fld("Contato", r.contacts)}${fld("Referências", r.reference_urls)}
          <div class="card" style="box-shadow:none"><h3>Notas</h3>${(notes || []).length ? `<div class="feed">${notes.map((n) => `<div><span class="dot">${ic(n.is_public ? "eye" : "lock", 16)}</span><span>${e(n.note)}<small>${NC.fmtDateTime(n.created_at)} · ${n.is_public ? "visível ao cliente" : "interna"}</small></span></div>`).join("")}</div>` : `<p class="muted small">Sem notas.</p>`}
            <textarea id="nn" placeholder="Escreva uma nota" style="margin-top:.6rem"></textarea>
            <div class="row" style="margin-top:.5rem"><label class="row" style="font-weight:600"><input type="checkbox" id="np"> Visível ao cliente</label><button class="btn sm" id="addN">Adicionar nota</button></div></div>
        </div>
        <div class="stack"><label>Status<select id="rs">${Object.entries(RQ).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
          <label>Responsável interno<input id="ra" value="${e(r.assigned_to || "")}" placeholder="Nome"></label>
          <button class="btn" id="svR">${ic("check", 18)} Salvar status</button>
          <hr style="border:0;border-top:1px solid var(--line)">
          <h3 style="margin:0">Publicar</h3>
          <label>URL do mini site<input id="pu" placeholder="https://..." value="${e(c.minisite_url || "")}"></label>
          <button class="btn primary" id="pub">${ic("rocket", 18)} Marcar como publicado e vincular</button>
          <a class="btn ghost" href="#cliente/${r.customer_id}">Abrir cliente</a></div></div>`,
      onOpen: (w) => {
        NC.$("#rs", w).value = r.status;
        NC.$("#svR", w).onclick = async () => { const { error } = await NC.sb.from("nc_minisite_requests").update({ status: NC.$("#rs", w).value, assigned_to: NC.$("#ra", w).value.trim() || null }).eq("id", r.id); if (error) return NC.err(error); NC.toast("Solicitação atualizada."); w.remove(); route(); };
        NC.$("#addN", w).onclick = async () => { const note = NC.$("#nn", w).value.trim(); if (!note) return; const { error } = await NC.sb.from("nc_minisite_notes").insert({ request_id: r.id, note, is_public: NC.$("#np", w).checked }); if (error) return NC.err(error); NC.toast("Nota adicionada."); w.remove(); reqModal(r); };
        NC.$("#pub", w).onclick = async () => {
          const url = NC.normalizeUrl(NC.$("#pu", w).value); if (!url) return NC.toast("Informe uma URL https válida.", "err");
          const a = await NC.sb.from("nc_minisite_requests").update({ status: "published" }).eq("id", r.id);
          const b = await NC.sb.from("nc_customers").update({ minisite_status: "published", minisite_url: url }).eq("id", r.customer_id);
          if (a.error || b.error) return NC.err(a.error || b.error);
          NC.toast("Mini site publicado e vinculado ao cliente!"); w.remove(); route();
        };
      },
      actions: [{ label: "Fechar", cls: "ghost" }]
    });
  }

  /* ======================= CONFIGURAÇÕES ======================= */
  async function config(v) {
    const [st, ad] = await Promise.all([NC.sb.from("nc_settings").select("*"), NC.sb.from("nc_profiles").select("*").eq("role", "superadmin").order("created_at")]);
    const set = {}; (st.data || []).forEach((x) => (set[x.key] = x.value));
    const p = set.platform || {}, m = set.minisite_text || {};
    let models = Array.isArray(set.minisite_models) ? set.minisite_models.slice() : [];
    v.innerHTML = `<div class="topbar"><div><h1>Configurações</h1></div></div>
      <div class="split"><div class="stack">
        <form class="card stack" id="fP"><h3 style="margin:0">Plataforma</h3>
          <div class="grid2"><label>Nome da plataforma<input name="name" value="${e(p.name || "Nexcube 3D")}"></label><label>Domínio público<input name="domain" value="${e(p.domain || "www.nexcube3d.com.br")}" disabled></label></div>
          <div class="grid2"><label>WhatsApp de suporte<input name="support_whatsapp" value="${e(p.support_whatsapp || "")}"></label><label>E-mail de suporte<input name="support_email" type="email" value="${e(p.support_email || "")}"></label></div>
          <div><button class="btn primary">Salvar</button></div></form>
        <div class="card stack"><div class="row between"><h3 style="margin:0">${ic("rocket")} Modelos de mini site (vitrine)</h3><button class="btn sm" id="mAdd">${ic("plus", 16)} Adicionar</button></div>
          <p class="muted small">Aparecem para a NexCube e para os clientes como exemplos para vender o mini site DDS.</p>
          <div id="mList" class="stack" style="gap:.6rem"></div>
          <div><button class="btn primary" id="mSave">Salvar modelos</button></div></div>
        <form class="card stack" id="fM"><h3 style="margin:0">Texto comercial do mini site</h3>
          <label>Título<input name="title" value="${e(m.title || "")}"></label><label>Texto<textarea name="body">${e(m.body || "")}</textarea></label>
          <div><button class="btn primary">Salvar</button></div></form></div>
        <div class="card stack"><h3 style="margin:0">Administradores</h3>
          <div class="feed">${(ad.data || []).map((a) => `<div><span class="dot">${ic("user", 16)}</span><span>${e(a.full_name || "Administrador")}<small>${e(NC.fmtPhone(a.email || ""))}</small></span></div>`).join("")}</div>
          <form class="stack" id="fA"><label>Nome<input name="full_name" required></label>
            <div class="grid2"><label>Telefone<input name="phone" type="tel" required></label><label>Repita o telefone<input name="phone2" type="tel" required></label></div>
            <div class="grid2">${NC.pinInput("pin", "PIN (4 números)")}${NC.pinInput("pin2", "Repita o PIN")}</div>
            <button class="btn">${ic("plus", 18)} Adicionar administrador</button></form></div></div>`;
    const drawModels = () => {
      NC.$("#mList").innerHTML = models.length ? models.map((md, i) => `<div class="model-row">
        <input data-k="title" data-i="${i}" placeholder="Nome" value="${e(md.title || "")}">
        <input data-k="segment" data-i="${i}" placeholder="Segmento" value="${e(md.segment || "")}">
        <input data-k="url" data-i="${i}" placeholder="https://..." value="${e(md.url || "")}">
        <input type="color" data-k="color" data-i="${i}" value="${e(md.color || "#6a3bff")}">
        <button class="icon-btn danger" data-rm="${i}" aria-label="Remover">${ic("trash", 18)}</button></div>`).join("") : `<div class="empty">Nenhum modelo.</div>`;
      NC.$$("#mList input").forEach((inp) => (inp.oninput = () => (models[inp.dataset.i][inp.dataset.k] = inp.value)));
      NC.$$("#mList [data-rm]").forEach((b) => (b.onclick = () => { models.splice(+b.dataset.rm, 1); drawModels(); }));
    };
    drawModels();
    NC.$("#mAdd").onclick = () => { models.push({ title: "", segment: "", url: "", color: "#6a3bff" }); drawModels(); };
    NC.$("#mSave").onclick = async () => {
      const clean = []; for (const md of models) { if (!md.title && !md.url) continue; const u = NC.normalizeUrl(md.url); if (!u || !md.title) return NC.toast("Cada modelo precisa de nome e link https válido.", "err"); clean.push({ title: md.title.trim(), segment: (md.segment || "").trim(), url: u, color: md.color || "#6a3bff" }); }
      const { error } = await NC.sb.from("nc_settings").upsert({ key: "minisite_models", value: clean, updated_at: new Date().toISOString() });
      if (error) return NC.err(error); models = clean; drawModels(); NC.toast("Modelos salvos!");
    };
    NC.$("#fP").onsubmit = async (x) => { x.preventDefault(); const f = x.target; const val = { ...p, name: f.name.value.trim(), support_whatsapp: NC.digits(f.support_whatsapp.value), support_email: f.support_email.value.trim() };
      const { error } = await NC.sb.from("nc_settings").upsert({ key: "platform", value: val, updated_at: new Date().toISOString() }); if (error) return NC.err(error); NC.toast("Configurações salvas."); };
    NC.$("#fM").onsubmit = async (x) => { x.preventDefault(); const f = x.target;
      const { error } = await NC.sb.from("nc_settings").upsert({ key: "minisite_text", value: { title: f.title.value.trim(), body: f.body.value.trim() }, updated_at: new Date().toISOString() }); if (error) return NC.err(error); NC.toast("Texto salvo."); };
    const fA = NC.$("#fA"); NC.maskPhone(fA.phone); NC.maskPhone(fA.phone2);
    fA.onsubmit = async (x) => { x.preventDefault(); const f = x.target; const ok = NC.checkPhonePin(f); if (!ok) return; const btn = NC.$("button", f); btn.disabled = true;
      try { await fn({ action: "create_admin", name: f.full_name.value.trim(), phone: ok.phone, pin: ok.pin }); NC.toast("Administrador adicionado!"); config(v); }
      catch (err) { NC.err(err); btn.disabled = false; } };
  }

  boot();
})();
