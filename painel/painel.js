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
    { id: "minisite", label: "Mini site", icon: "rocket" }
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
    ({ inicio, links, pagina, aparencia, tag, stats, minisite })[id](v);
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
  const REQ_STEPS = [["received", "Recebido"], ["analysis", "Em análise"], ["waiting_content", "Aguardando conteúdo"], ["in_development", "Em desenvolvimento"], ["waiting_approval", "Aguardando sua aprovação"], ["published", "Publicado"]];
  function minisite(v) {
    const c = S.c, txt = S.settings.minisite_text || {};
    const req = S.reqs.find((r) => r.status !== "cancelled");
    let body = "";
    if (c.minisite_status === "published" && c.minisite_url) {
      body = `<div class="card stack"><span class="badge ok" style="width:max-content">Publicado</span><h2>Seu mini site está no ar 🎉</h2>
        <div class="url-line"><span>${e(c.minisite_url)}</span><button class="icon-btn" id="cpMs">${ic("copy", 18)}</button></div>
        <div class="row"><a class="btn primary" target="_blank" rel="noopener" href="${e(c.minisite_url)}">${ic("eye", 18)} Visualizar</a><button class="btn" id="toTag">${ic("tag", 18)} Apontar minha tag para o mini site</button></div>
        <p class="muted small">Quer mudar textos, fotos ou serviços? Fale com a DDS Inovação; ajustes avançados são feitos pela equipe.</p>
        <a class="btn" target="_blank" rel="noopener" href="${NC.waLink(C.dds.whatsapp, "Olá DDS! Quero ajustar o meu mini site (" + c.company_name + ").")}">${ic("whatsapp", 18)} Pedir ajuste à DDS</a></div>`;
    } else if (req) {
      const idx = REQ_STEPS.findIndex((s) => s[0] === req.status);
      const pub = S.notes.filter((n) => n.request_id === req.id && n.is_public);
      body = `<div class="split"><div class="card"><h3>Andamento do seu mini site</h3><p class="muted small" style="margin-bottom:1rem">Solicitado em ${NC.fmtDate(req.created_at)}</p>
        <div class="timeline">${REQ_STEPS.map((s, i) => `<div class="tl ${i < idx ? "done" : i === idx ? "cur" : ""}"><span class="d">${i < idx ? ic("check", 14) : ""}</span><div><b>${s[1]}</b>${i === idx ? "<small>Etapa atual</small>" : ""}</div></div>`).join("")}</div></div>
        <div class="card"><h3>Mensagens da equipe</h3>${pub.length ? `<div class="feed">${pub.map((n) => `<div><span class="dot">${ic("sparkle", 16)}</span><span>${e(n.note)}<small>${NC.fmtDateTime(n.created_at)}</small></span></div>`).join("")}</div>` : `<div class="empty">Assim que houver novidades, elas aparecem aqui.</div>`}
          <a class="btn block" style="margin-top:1rem" target="_blank" rel="noopener" href="${NC.waLink(C.dds.whatsapp, "Olá DDS! Sobre o mini site da " + c.company_name + ", quero enviar materiais.")}">${ic("whatsapp", 18)} Enviar fotos e materiais</a></div></div>`;
    } else {
      body = `${ddsAd()}
        <div class="card" style="margin-top:1rem"><h2>${e(txt.title || "Mini site profissional")}</h2><p class="muted" style="margin-top:.4rem">${e(txt.body || "")}</p>
        <div class="benefits">
          <div><b>🌐 Presença completa</b><span>Sobre, serviços, fotos, mapa e contato em um só lugar.</span></div>
          <div><b>📱 Feito para celular</b><span>Rápido e bonito em qualquer tela.</span></div>
          <div><b>🔗 Integra com sua tag</b><span>Sua tag pode abrir o mini site direto.</span></div>
          <div><b>🛠️ Feito por especialistas</b><span>Desenvolvido sob medida pela DDS Inovação.</span></div>
        </div>
        <p class="alert warn small">${ic("sparkle", 18)}<span>Serviço adicional e opcional, <b>não incluso</b> no plano da tag. Após o pedido, a DDS entra em contato com briefing, orçamento e prazo.</span></p>
        <div class="row" style="margin:1rem 0"><a class="btn primary" href="${e(C.dds.minisite)}" target="_blank" rel="noopener">${ic("rocket", 18)} Conhecer o Mini Site DDS</a>
          <a class="btn" target="_blank" rel="noopener" href="${NC.waLink(C.dds.whatsapp, "Olá DDS! Sou cliente Nexcube 3D (" + c.company_name + ") e quero um mini site.")}">${ic("whatsapp", 18)} Falar com a DDS</a></div>
        <h3 style="margin-top:1.2rem">Ou deixe sua solicitação aqui</h3>
        <form class="stack" id="fReq">
          <div class="grid2"><label>Segmento do negócio<input name="business_type" required placeholder="Ex.: confeitaria, salão, clínica"></label>
          <label>Objetivo principal<select name="goals"><option>Receber mais contatos no WhatsApp</option><option>Mostrar meus produtos/serviços</option><option>Passar mais credibilidade</option><option>Vender online</option><option>Outro</option></select></label></div>
          <label>Conte sobre o seu negócio<textarea name="business_description" required maxlength="2000" placeholder="O que você faz, para quem, diferenciais..."></textarea></label>
          <label>Produtos ou serviços principais<textarea name="services_products" maxlength="2000"></textarea></label>
          <div class="grid2"><label>Melhor contato<input name="contacts" placeholder="WhatsApp ou e-mail" value="${e(c.phone || c.email || "")}"></label>
          <label>Sites que você gosta <small>(referências)</small><input name="reference_urls" placeholder="links separados por vírgula"></label></div>
          <div><button class="btn primary">${ic("rocket", 18)} Enviar solicitação</button></div>
        </form></div>`;
    }
    v.innerHTML = `<div class="topbar"><div><h1>Mini site</h1><p class="muted">Um site completo para o seu negócio, criado pela DDS Inovação.</p></div></div>${body}`;
    const cp = NC.$("#cpMs"); if (cp) cp.onclick = () => NC.copy(c.minisite_url);
    const tt = NC.$("#toTag"); if (tt) tt.onclick = () => go("tag");
    const f = NC.$("#fReq");
    if (f) f.onsubmit = async (ev) => {
      ev.preventDefault(); const btn = NC.$("button.primary", f); btn.disabled = true;
      const row = { customer_id: c.id };
      ["business_type", "goals", "business_description", "services_products", "contacts", "reference_urls"].forEach((k) => (row[k] = f[k].value.trim() || null));
      const { data, error } = await NC.sb.from("nc_minisite_requests").insert(row).select().single();
      btn.disabled = false;
      if (error) return NC.err(error);
      S.reqs.unshift(data); S.c.minisite_status = "requested";
      NC.toast("Solicitação enviada! A DDS Inovação vai entrar em contato."); minisite(v);
    };
  }

  // esconder a prévia lateral no mobile
  const st = document.createElement("style"); st.textContent = "@media(max-width:1100px){.hide-m{display:none}}"; document.head.appendChild(st);
  boot();
})();
