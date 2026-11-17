/* Painel do cliente — /painel */
(function () {
  const NC = window.NC, C = window.NC_CONFIG, e = NC.esc, ic = NC.icon, ED = NC.editor;
  const root = NC.$("#root");
  const S = { me: null, c: null, links: [], tags: [], reqs: [], notes: [], settings: {}, view: "inicio" };

  const VIEWS = [
    { id: "inicio", label: "Início", icon: "home" },
    { id: "links", label: "Meus links", short: "Links", icon: "custom" },
    { id: "pagina", label: "Minha página", short: "Página", icon: "user" },
    { id: "aparencia", label: "Aparência", icon: "paint" },
    { id: "tag", label: "Minha tag", short: "Tag", icon: "tag" },
    { id: "stats", label: "Estatísticas", icon: "chart" },
    { id: "minisite", label: "Mini site", icon: "rocket" },
    { id: "indique", label: "Indique e ganhe", icon: "users" }
  ];
  const BOTTOM = ["inicio", "links", "pagina", "tag", "stats"];

  async function boot() {
    const s = await NC.getProfile();
    if (!s) {
      return NC.renderLogin(root, { title: "Entrar no meu painel", subtitle: "Painel do cliente", onDone: boot });
    }
    S.me = s;
    if (s.profile && s.profile.role === "superadmin") {
      await NC.sb.auth.signOut();
      NC.toast("Esse telefone é de administrador. Para gerenciar clientes use /adm. Aqui, entre com o telefone do cliente.", "err");
      return NC.renderLogin(root, { title: "Entrar no meu painel", subtitle: "Painel do cliente", onDone: boot });
    }
    const { data: c } = await NC.sb.from("nc_customers").select("*").eq("owner_user_id", s.user.id).maybeSingle();
    if (!c) return blocked("Acesso não liberado", "Seu login ainda não está vinculado a nenhuma empresa. Fale com a Nexcube 3D para liberar o seu acesso.");
    if (c.status === "pending") return blocked("Aguardando liberação", "Seu cadastro está pronto! A Nexcube 3D vai liberar o seu painel em breve.");
    if (c.status === "suspended") return blocked("Acesso suspenso", "Seu painel está temporariamente suspenso. Fale com a Nexcube 3D para mais informações.");
    S.c = c;
    const [l, t, r, st] = await Promise.all([
      NC.sb.from("nc_links").select("*").eq("customer_id", c.id).order("sort_order"),
      NC.sb.from("nc_tags").select("*").eq("customer_id", c.id).order("created_at"),
      NC.sb.from("nc_minisite_requests").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }),
      NC.sb.from("nc_settings").select("*")
    ]);
    S.links = l.data || []; S.tags = t.data || []; S.reqs = r.data || [];
    (st.data || []).forEach((x) => (S.settings[x.key] = x.value));
    S.leads = []; S.comms = []; try { await loadLeads(); } catch (x) {}
    if (S.reqs.length) { const { data } = await NC.sb.from("nc_minisite_notes").select("*").in("request_id", S.reqs.map((x) => x.id)).order("created_at"); S.notes = data || []; }
    shell();
    addEventListener("hashchange", () => { const h = location.hash.replace("#", ""); if (h && h !== S.view) go(h); });
    go((location.hash.replace("#", "") || "inicio"));
  }

  function blocked(title, text) {
    root.innerHTML = `<div class="auth"><div class="auth-card" style="text-align:center">
      <div style="font-size:2.4rem">⏳</div><h1>${e(title)}</h1><p class="muted">${e(text)}</p>
      <div class="stack" style="margin-top:1.4rem">
        <a class="btn primary block" target="_blank" rel="noopener" href="${NC.waLink(C.nexcubeWhatsapp, "Olá! Quero liberar meu painel Nexcube 3D.")}">${ic("whatsapp")} Falar com a Nexcube 3D</a>
        <button class="btn ghost block" id="out">Sair</button></div></div></div>`;
    NC.$("#out").onclick = async () => { await NC.sb.auth.signOut(); boot(); };
  }

  function shell() {
    const c = S.c;
    root.innerHTML = `
    <div class="mtop"><button class="icon-btn" id="mOpen" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.2)" aria-label="Menu">${ic("menuBars")}</button>
      <b style="font-size:.95rem">${e(c.company_name)}</b><img src="/assets/logo-cube.png" alt=""></div>
    <div class="app">
      <aside class="side" id="side">
        <div class="brand"><img src="/assets/logo-cube.png" alt=""><div><b>NEX<span>CUBE</span> 3D</b><small>MEU PAINEL</small></div></div>
        ${VIEWS.map((v) => `<button class="nav-a" data-go="${v.id}">${ic(v.icon)} ${v.label}</button>`).join("")}
        <a class="nav-a" href="${e(NC.publicUrl(c.public_slug))}" target="_blank" rel="noopener">${ic("eye")} Ver minha página</a>
        <div class="spacer"></div>
        <a class="nav-a" target="_blank" rel="noopener" href="${NC.waLink(C.nexcubeWhatsapp, "Olá! Preciso de ajuda com meu painel Nexcube 3D.")}">${ic("whatsapp")} Ajuda</a>
        <button class="nav-a" id="chPin">${ic("lock")} Trocar meu PIN</button>
        <button class="nav-a" id="logout">${ic("logout")} Sair</button>
        <div class="who">${e(NC.fmtPhone(NC.userPhone(S.me.user)))}</div>
      </aside>
      <main class="main" id="view"></main>
    </div>
    <nav class="bnav">${BOTTOM.map((id) => { const v = VIEWS.find((x) => x.id === id); return `<button data-go="${id}">${ic(v.icon, 22)}<span>${v.short || v.label}</span></button>`; }).join("")}</nav>`;
    NC.$$("[data-go]").forEach((b) => (b.onclick = () => { go(b.dataset.go); NC.$("#side").classList.remove("open"); }));
    NC.$("#logout").onclick = async () => { await NC.sb.auth.signOut(); location.hash = ""; boot(); };
    NC.$("#chPin").onclick = () => NC.changePin(NC.userPhone(S.me.user));
    NC.$("#mOpen").onclick = (ev) => { ev.stopPropagation(); NC.$("#side").classList.toggle("open"); };
    document.addEventListener("click", (ev) => { const sd = NC.$("#side"); if (sd && sd.classList.contains("open") && !sd.contains(ev.target)) sd.classList.remove("open"); });
  }

  function go(id) {
    if (!VIEWS.find((v) => v.id === id)) id = "inicio";
    S.view = id; if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    NC.$$("[data-go]").forEach((b) => b.classList.toggle("on", b.dataset.go === id));
    const v = NC.$("#view"); window.scrollTo(0, 0);
    ({ inicio, links, pagina, aparencia, tag, stats, minisite, indique })[id](v);
  }

  /* Layout com prévia ao vivo ao lado (desktop) ou botão de prévia (mobile) */
  function withPreview(v, title, sub) {
    v.innerHTML = `<div class="topbar"><div><h1>${title}</h1><p class="muted">${sub}</p></div>
      <div class="row"><button class="btn sm" id="pvBtn">${ic("eye", 16)} Ver prévia</button><a class="btn sm" target="_blank" rel="noopener" href="${e(NC.publicUrl(S.c.public_slug))}">Abrir página</a></div></div>
      <div class="split"><div id="edit"></div><div class="preview-col hide-m"><p class="muted small" style="text-align:center;margin-bottom:.6rem">Prévia ao vivo</p><div class="phone-frame"><div class="pv" id="pv"></div></div></div></div>`;
    const refresh = () => { const pv = NC.$("#pv"); if (pv) NC.renderPublic(pv, ED.previewData(S.c, S.links), { preview: true }); };
    NC.$("#pvBtn").onclick = () => { const m = NC.modal({ title: "Prévia da sua página", body: `<div class="phone-frame" style="position:static"><div class="pv" id="pvM"></div></div>`, actions: [{ label: "Fechar", cls: "ghost" }] }); NC.renderPublic(NC.$("#pvM", m.el), ED.previewData(S.c, S.links), { preview: true }); };
    refresh();
    return { edit: NC.$("#edit"), refresh };
  }

  /* ---------------- INÍCIO ---------------- */
  async function inicio(v) {
    const c = S.c;
    const steps = [
      { done: !!c.logo_path, t: "Coloque sua logo", d: "Sua marca no topo da página.", go: "pagina" },
      { done: !!c.short_bio, t: "Escreva uma frase curta", d: "Diga em poucas palavras o que você faz.", go: "pagina" },
      { done: S.links.filter((l) => l.is_active).length >= 2, t: "Adicione pelo menos 2 links", d: "WhatsApp e Instagram são os mais clicados.", go: "links" },
      { done: c.primary_color !== "#7a3cff" || c.bg_color !== "#0f0e1a", t: "Deixe com as suas cores", d: "Escolha uma combinação em Aparência.", go: "aparencia" },
      { done: S.tags.some((t) => t.last_access_at), t: "Teste sua tag", d: "Aproxime o celular da tag ou leia o QR Code.", go: "tag" }
    ];
    const n = steps.filter((s) => s.done).length;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    v.innerHTML = `
      <div class="hello"><h1>Olá, ${e((c.contact_name || c.company_name).split(" ")[0])}! 👋</h1>
        <p>Aqui você controla a página que abre quando alguém aproxima o celular da sua tag ou lê o seu QR Code.</p>
        <div class="row"><a class="btn white" target="_blank" rel="noopener" href="${e(NC.publicUrl(c.public_slug))}">${ic("eye", 18)} Ver minha página</a>
          <button class="btn" id="cpUrl">${ic("copy", 18)} Copiar link</button></div></div>
      <div class="cards" id="kpis">
        <div class="kpi"><span>${ic("eye", 16)} Visitas (30 dias)</span><b>…</b></div>
        <div class="kpi"><span>${ic("custom", 16)} Cliques nos links</span><b>…</b></div>
        <div class="kpi"><span>${ic("tag", 16)} Minhas tags</span><b>${S.tags.length}</b><small>${S.tags.filter((t) => t.status === "active").length} ativa(s)</small></div>
        <div class="kpi"><span>${ic("rocket", 16)} Mini site</span><b style="font-size:1.1rem;margin-top:.5rem">${{ none: "Não contratado", requested: "Solicitado", in_progress: "Em produção", published: "Publicado ✅" }[c.minisite_status]}</b></div>
      </div>
      <div class="split">
        <div class="card"><div class="row between"><h3 style="margin:0">Primeiros passos</h3><span class="badge ${n === steps.length ? "ok" : "info"}">${n} de ${steps.length}</span></div>
          <div class="progress"><i style="width:${(n / steps.length) * 100}%"></i></div>
          <div class="checklist">${steps.map((s) => `<button class="check-item ${s.done ? "done" : ""}" data-step="${s.go}"><span class="ck">${s.done ? ic("check", 16) : ""}</span><span class="grow"><b>${s.t}</b><small>${s.d}</small></span>${ic("down", 16)}</button>`).join("")}</div>
        </div>
        <div class="stack">
          <div class="card"><h3>Atalhos</h3><div class="stack" style="gap:.5rem">
            <button class="btn block" data-q="links">${ic("plus", 18)} Adicionar ou mudar um link</button>
            <button class="btn block" data-q="aparencia">${ic("paint", 18)} Mudar cores da página</button>
            <button class="btn block" data-q="tag">${ic("tag", 18)} Ver meu QR Code / mudar destino</button>
            ${c.minisite_status === "none" ? `<button class="btn block" data-q="minisite">${ic("rocket", 18)} Quero um mini site</button>` : ""}
          </div></div>
          ${c.minisite_status === "none" ? ddsAd() : ""}
        </div>
      </div>`;
    NC.$("#cpUrl").onclick = () => NC.copy(NC.publicUrl(c.public_slug), "Link da sua página copiado!");
    NC.$$("[data-step],[data-q]", v).forEach((b) => (b.onclick = () => go(b.dataset.step || b.dataset.q)));
    const { data } = await NC.sb.from("nc_events").select("event_type,ua_category").eq("customer_id", c.id).gte("created_at", since).limit(20000);
    const ev = (data || []).filter((x) => x.ua_category !== "bot");
    const k = NC.$$("#kpis .kpi b");
    if (k.length) { k[0].textContent = ev.filter((x) => x.event_type === "view").length; k[1].textContent = ev.filter((x) => x.event_type === "click").length; }
  }

  function ddsAd() {
    return `<div class="dds-ad"><div class="dds-logo">DDS</div><div><small>DDS Inovação</small><b>Mini Site DDS para o seu negócio</b>
      <p>Veja como funciona o mini site profissional da DDS Inovação.</p></div>
      <a class="btn sm" href="${e(C.dds.minisite)}" target="_blank" rel="noopener">Ver como funciona →</a></div>`;
  }

  /* ---------------- LINKS ---------------- */
  function links(v) {
    const w = withPreview(v, "Meus links", "Adicione, edite, esconda ou mude a ordem dos botões da sua página.");
    ED.links(w.edit, S.c, S, { onChange: w.refresh });
  }
  /* ---------------- PÁGINA ---------------- */
  function pagina(v) {
    const w = withPreview(v, "Minha página", "Logo, nome, apresentação e contatos que aparecem para o visitante.");
    ED.profile(w.edit, S.c, { onChange: w.refresh, onSaved: w.refresh });
  }
  /* ---------------- APARÊNCIA ---------------- */
  function aparencia(v) {
    const w = withPreview(v, "Aparência", "Deixe a página com a cara da sua marca.");
    ED.appearance(w.edit, S.c, { onChange: w.refresh, onSaved: w.refresh });
  }
  /* ---------------- TAG ---------------- */
  function tag(v) {
    v.innerHTML = `<div class="topbar"><div><h1>Minha tag</h1><p class="muted">Seu QR Code e o destino da sua tag NFC.</p></div></div>
      <div class="alert info section">${ic("sparkle", 18)}<span><b>Como funciona:</b> a tag NFC e o QR Code guardam um endereço fixo da Nexcube 3D. Você escolhe aqui para onde ele leva, quantas vezes quiser.</span></div>
      <div class="stack" id="tagList"></div>`;
    const list = NC.$("#tagList");
    if (!S.tags.length) { list.innerHTML = `<div class="card empty">${ic("tag", 34)}Você ainda não tem tags vinculadas. Fale com a Nexcube 3D.</div>`; return; }
    S.tags.forEach((t) => { const d = document.createElement("div"); list.appendChild(d); ED.tagCard(d, t, S.c, {}); });
  }
  /* ---------------- ESTATÍSTICAS ---------------- */
  function stats(v) {
    v.innerHTML = `<div class="topbar"><div><h1>Estatísticas</h1><p class="muted">Quantas pessoas visitaram sua página e onde clicaram.</p></div></div><div id="st"></div>`;
    ED.stats(NC.$("#st"), S.c, S.tags, S.links);
  }

  /* ---------------- MINI SITE ---------------- */
  /* ---------------- MINI SITE ---------------- */
  function minisite(v) {
    const c = S.c;
    const price = S.settings.minisite_price ? S.settings.minisite_price.value : null;
    if (c.minisite_status === "published" && c.minisite_url) {
      v.innerHTML = `<div class="topbar"><div><h1>Mini site</h1><p class="muted">Seu site profissional, criado pela DDS Inovação.</p></div></div>
        <div class="card stack"><span class="badge ok" style="width:max-content">${ic("check", 14)} No ar</span><h2>Seu mini site está publicado 🎉</h2>
        <div class="url-line"><span>${e(c.minisite_url)}</span><button class="icon-btn" id="cpMs">${ic("copy", 18)}</button></div>
        <div class="row"><a class="btn primary" target="_blank" rel="noopener" href="${e(c.minisite_url)}">${ic("eye", 18)} Abrir</a><button class="btn" id="toTag">${ic("tag", 18)} Fazer a tag abrir o mini site</button></div>
        <a class="btn ghost" target="_blank" rel="noopener" href="${NC.waLink(C.dds.whatsapp, "Olá DDS! Quero ajustar o meu mini site (" + c.company_name + ").")}">${ic("whatsapp", 18)} Pedir ajuste à DDS</a></div>
        <div class="card section" style="margin-top:1rem" id="sc"></div>`;
      NC.$("#cpMs").onclick = () => NC.copy(c.minisite_url); NC.$("#toTag").onclick = () => go("tag");
      ED.showcase(NC.$("#sc"), { mode: "client", c, price }); NC.$("#sc [data-self]") && NC.$("#sc [data-self]").remove();
      return;
    }
    const mine = S.leads.find((l) => l.ref_kind === "self" && l.status !== "lost");
    v.innerHTML = `<div class="topbar"><div><h1>Mini site</h1><p class="muted">Um site completo para o seu negócio, criado pela DDS Inovação.</p></div></div>
      ${mine ? `<div class="alert ok section">${ic("check", 18)}<span><b>Pedido enviado em ${NC.fmtDate(mine.created_at)}.</b> A DDS Inovação vai falar com você pelo WhatsApp para combinar os detalhes.</span></div>` : ""}
      <div class="card" id="sc"></div>`;
    ED.showcase(NC.$("#sc"), { mode: "client", c, price, onSelf: () => selfRequest(v) });
  }
  function selfRequest(v) {
    const MS = window.NC_MS;
    NC.modal({
      title: "Quero um mini site",
      body: `<form class="stack" id="fSelf"><p class="muted small">A DDS Inovação recebe seu pedido e fala com você pelo WhatsApp ${e(NC.fmtPhone(S.c.phone || ""))}.</p>
        <label>Qual modelo mais combina com você?<select name="model"><option value="">Ainda não sei</option>${MS.models.map((m) => `<option value="${m.id}">${e(m.full)}</option>`).join("")}</select></label>
        <label>Conte rapidinho sobre o seu negócio <small>(opcional)</small><input name="business" maxlength="160" placeholder="Ex.: confeitaria artesanal, atendo por encomenda"></label>
        <a class="small" href="${e(MS.examplesUrl)}" target="_blank" rel="noopener">${ic("eye", 16)} Ver os modelos antes</a></form>`,
      actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Enviar pedido", cls: "primary", onClick: async (w) => {
        const f = NC.$("#fSelf", w);
        const { data, error } = await NC.sb.rpc("nc_self_lead", { p_model: f.model.value || null, p_business: f.business.value.trim() || null });
        if (error || !data || !data.ok) { NC.err(error || { message: "Não foi possível enviar." }); return false; }
        const m = MS.models.find((x) => x.id === f.model.value);
        window.open(NC.waLink(C.dds.whatsapp, `Olá DDS! Sou cliente Nexcube 3D (${S.c.company_name}) e quero um mini site${m ? " no modelo " + m.full : ""}.`), "_blank", "noopener");
        await loadLeads(); NC.toast("Pedido enviado! A DDS vai te chamar."); minisite(v);
      } }]
    });
  }

  /* ---------------- INDIQUE E GANHE ---------------- */
  async function loadLeads() {
    const [l, cm] = await Promise.all([
      NC.sb.from("nc_ref_leads").select("*").eq("customer_id", S.c.id).order("created_at", { ascending: false }),
      NC.sb.from("nc_commissions").select("*").eq("customer_id", S.c.id).eq("beneficiary", "client").order("created_at", { ascending: false })
    ]);
    S.leads = l.data || []; S.comms = cm.data || [];
  }
  const LEAD_ST = { new: ["Novo pedido", "info"], contact: ["Em conversa", "warn"], sold: ["Vendido ✅", "ok"], lost: ["Não fechou", ""] };
  async function indique(v) {
    await loadLeads();
    const price = S.settings.minisite_price ? S.settings.minisite_price.value : null;
    const pend = S.comms.filter((x) => x.status === "pending").reduce((a, x) => a + Number(x.amount), 0);
    const paid = S.comms.filter((x) => x.status === "paid").reduce((a, x) => a + Number(x.amount), 0);
    const refs = S.leads.filter((x) => x.ref_kind === "client");
    v.innerHTML = `<div class="topbar"><div><h1>Indique e ganhe</h1><p class="muted">Ganhe 10% em cada mini site DDS vendido pelo seu link.</p></div></div>
      <div class="cards">
        <div class="kpi"><span>${ic("users", 16)} Indicações</span><b>${refs.length}</b><small>${refs.filter((x) => x.status === "sold").length} vendidas</small></div>
        <div class="kpi"><span>${ic("clock", 16)} A receber</span><b>${ED.fmtMoney(pend)}</b><small>pago por Pix pela DDS</small></div>
        <div class="kpi"><span>${ic("check", 16)} Já recebido</span><b>${ED.fmtMoney(paid)}</b><small>total pago</small></div>
        <div class="kpi"><span>${ic("rocket", 16)} Você ganha por venda</span><b>${price ? ED.fmtMoney(price * 0.1) : "10%"}</b><small>${price ? "10% de " + ED.fmtMoney(price) : "do valor do mini site"}</small></div>
      </div>
      <div class="card section" id="sc"></div>
      <div class="split">
        <div class="card"><h3>Suas indicações</h3>${refs.length ? `<div class="feed">${refs.map((x) => `<div><span class="dot">${ic("user", 16)}</span><span class="grow">${e(x.name)} ${x.business ? `<span class="muted small">· ${e(x.business)}</span>` : ""}<small>${NC.fmtDate(x.created_at)}</small></span><span class="badge ${LEAD_ST[x.status][1]}">${LEAD_ST[x.status][0]}</span></div>`).join("")}</div>` : `<div class="empty">${ic("users", 30)}Ninguém pediu pelo seu link ainda. Compartilhe!</div>`}</div>
        <div class="card"><h3>Suas comissões</h3>${S.comms.length ? `<div class="feed">${S.comms.map((x) => `<div><span class="dot">${ic(x.status === "paid" ? "check" : "clock", 16)}</span><span class="grow"><b>${ED.fmtMoney(x.amount)}</b> <span class="muted small">(${Number(x.percent)}%)</span><small>${x.status === "paid" ? "Pago em " + NC.fmtDate(x.paid_at) : "A receber"}</small></span></div>`).join("")}</div>` : `<div class="empty">Suas comissões aparecem aqui quando uma indicação virar venda.</div>`}
          <p class="muted tiny" style="margin-top:.8rem">Comissão de 10% sobre mini sites vendidos pelo seu link, paga por Pix pela DDS Inovação. Compras feitas por você mesmo não geram comissão para você.</p></div>
      </div>`;
    ED.showcase(NC.$("#sc"), { mode: "client", c: S.c, price }); const sb = NC.$("#sc [data-self]"); if (sb) sb.remove();
  }

  // esconder a prévia lateral no mobile
  const st = document.createElement("style"); st.textContent = "@media(max-width:1100px){.hide-m{display:none}}"; document.head.appendChild(st);
  boot();
})();
