/* Núcleo compartilhado: Supabase, utilidades, ícones, QR Code, modais e toasts */
(function () {
  const C = window.NC_CONFIG;
  const NC = (window.NC = window.NC || {});

  NC.sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "nc-auth" }
  });

  /* ---------- utilidades ---------- */
  NC.$ = (s, r = document) => r.querySelector(s);
  NC.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  NC.esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  NC.fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
  NC.fmtDateTime = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
  NC.slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  NC.publicUrl = (slug) => `${C.site}/${slug}`;
  NC.tagUrl = (code) => `${C.site}/r/${code}`;
  NC.fileUrl = (path) => (path ? `${C.supabaseUrl}/storage/v1/object/public/${C.bucket}/${path}` : null);
  NC.digits = (s) => String(s || "").replace(/\D/g, "");
  NC.waNumber = (s) => { let d = NC.digits(s); if (!d) return ""; if (d.length <= 11) d = "55" + d; return d; };
  NC.waLink = (num, msg) => `https://wa.me/${NC.waNumber(num)}${msg ? "?text=" + encodeURIComponent(msg) : ""}`;

  /* Normaliza e valida URL: só https, mailto e tel (bloqueia javascript:, data:, etc.) */
  NC.normalizeUrl = (raw) => {
    let u = String(raw || "").trim();
    if (!u) return null;
    if (/^(mailto:|tel:)/i.test(u)) return u.length > 6 ? u : null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:/i.test(u)) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    u = u.replace(/^http:\/\//i, "https://");
    try { const p = new URL(u); if (p.protocol !== "https:" || !p.hostname.includes(".")) return null; return p.href; } catch { return null; }
  };

  NC.contrastText = (hex) => {
    const h = String(hex || "#000000").replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
  };

  /* ---------- ícones (SVG em linha) ---------- */
  const P = {
    whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6L3 21z"/><path d="M9 9.5c.3 1.6 1.9 3.6 3.9 4.6l1.2-1.2 2 1-.5 1.6c-3 .6-7.3-3.4-7.4-6.4l1.6-.6 1 2-1 1"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.4 4.6 5 4.8"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    maps: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    menu: '<path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.7 1.5-2 4-2 7h3v11"/>',
    catalog: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
    custom: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    // interface
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    paint: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.9-.8-1.3-.8-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M15 4c3-1 5 1 5 1s2 2 1 5l-7 7-6-6z"/><circle cx="15" cy="9" r="1.5"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    nfc: '<path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a9 9 0 0 1 0 12M13 3.5a13 13 0 0 1 0 17"/>',
    menuBars: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
  };
  NC.icon = (name, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.custom}</svg>`;

  /* Tipos de link do cliente — usados no painel (didático) */
  NC.LINK_TYPES = [
    { id: "whatsapp", label: "WhatsApp", ask: "whatsapp", title: "Fale no WhatsApp" },
    { id: "instagram", label: "Instagram", ask: "handle", base: "https://instagram.com/", title: "Instagram" },
    { id: "facebook", label: "Facebook", ask: "url", hint: "facebook.com/suapagina", title: "Facebook" },
    { id: "tiktok", label: "TikTok", ask: "handle", base: "https://www.tiktok.com/@", title: "TikTok" },
    { id: "youtube", label: "YouTube", ask: "url", hint: "youtube.com/@seucanal", title: "YouTube" },
    { id: "linkedin", label: "LinkedIn", ask: "url", hint: "linkedin.com/in/voce", title: "LinkedIn" },
    { id: "site", label: "Site", ask: "url", hint: "www.seusite.com.br", title: "Nosso site" },
    { id: "maps", label: "Google Maps", ask: "url", hint: "Cole o link do Google Maps", title: "Como chegar" },
    { id: "menu", label: "Cardápio", ask: "url", hint: "Link do cardápio", title: "Cardápio" },
    { id: "catalog", label: "Catálogo", ask: "url", hint: "Link do catálogo", title: "Catálogo" },
    { id: "email", label: "E-mail", ask: "email", title: "Envie um e-mail" },
    { id: "phone", label: "Telefone", ask: "phone", title: "Ligue para nós" },
    { id: "custom", label: "Outro link", ask: "url", hint: "Qualquer endereço https://", title: "" }
  ];
  NC.linkType = (id) => NC.LINK_TYPES.find((t) => t.id === id) || NC.LINK_TYPES[NC.LINK_TYPES.length - 1];

  /* ---------- toast / modal / confirmação ---------- */
  NC.toast = (msg, type = "ok") => {
    let box = NC.$("#nc-toasts");
    if (!box) { box = document.createElement("div"); box.id = "nc-toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast " + type; t.setAttribute("role", "status");
    t.innerHTML = NC.icon(type === "err" ? "x" : "check", 18) + `<span>${NC.esc(msg)}</span>`;
    box.appendChild(t); setTimeout(() => t.classList.add("out"), 3600); setTimeout(() => t.remove(), 4000);
  };
  NC.err = (e) => {
    console.error(e);
    let m = (e && (e.message || e.error_description || e.error)) || "Algo deu errado. Tente novamente.";
    if (/duplicate key.*public_slug/i.test(m)) m = "Esse endereço já está em uso. Escolha outro.";
    else if (/nc_customers_slug_reserved/i.test(m)) m = "Esse endereço é reservado. Escolha outro.";
    else if (/public_slug_check/i.test(m)) m = "Endereço inválido: use só letras minúsculas, números e hífen.";
    else if (/url_check|custom_url_check/i.test(m)) m = "Endereço (URL) inválido. Use um link https://";
    else if (/JWT|session/i.test(m)) m = "Sua sessão expirou. Entre novamente.";
    NC.toast(m, "err");
  };
  NC.modal = ({ title, body, actions = [], wide = false, onOpen }) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-bg";
    wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${NC.esc(title)}">
      <div class="modal-h"><h3>${NC.esc(title)}</h3><button class="icon-btn" data-x aria-label="Fechar">${NC.icon("x")}</button></div>
      <div class="modal-b"></div><div class="modal-f"></div></div>`;
    const b = NC.$(".modal-b", wrap); if (typeof body === "string") b.innerHTML = body; else b.appendChild(body);
    const f = NC.$(".modal-f", wrap);
    const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => e.key === "Escape" && close();
    actions.forEach((a) => {
      const btn = document.createElement("button");
      btn.className = "btn " + (a.cls || "");
      btn.textContent = a.label;
      btn.onclick = async () => { if (a.onClick) { btn.disabled = true; const r = await a.onClick(wrap, btn); btn.disabled = false; if (r === false) return; } close(); };
      f.appendChild(btn);
    });
    NC.$("[data-x]", wrap).onclick = close;
    wrap.addEventListener("mousedown", (e) => e.target === wrap && close());
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    const first = NC.$("input,select,textarea", wrap); if (first) setTimeout(() => first.focus(), 30);
    if (onOpen) onOpen(wrap);
    return { el: wrap, close };
  };
  NC.confirm = (title, text, okLabel = "Confirmar", danger = true) => new Promise((res) => {
    NC.modal({ title, body: `<p class="muted">${NC.esc(text)}</p>`,
      actions: [{ label: "Cancelar", cls: "ghost", onClick: () => res(false) }, { label: okLabel, cls: danger ? "danger" : "primary", onClick: () => res(true) }] });
  });

  NC.copy = async (text, msg = "Copiado!") => {
    try { await navigator.clipboard.writeText(text); NC.toast(msg); }
    catch { const i = document.createElement("textarea"); i.value = text; document.body.appendChild(i); i.select(); document.execCommand("copy"); i.remove(); NC.toast(msg); }
  };

  /* ---------- QR Code dinâmico ---------- */
  NC.qrSvg = (text, size = 220, dark = "#111111") => {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), m = 2, cell = size / (n + m * 2);
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${((c + m) * cell).toFixed(2)} ${((r + m) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#ffffff"/><path d="${d}" fill="${dark}"/></svg>`;
  };
  NC.downloadBlob = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  NC.downloadQr = (code, fmt = "png") => {
    const svg = NC.qrSvg(NC.tagUrl(code), 1024);
    if (fmt === "svg") return NC.downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `qrcode-${code}.svg`);
    const img = new Image();
    img.onload = () => { const cv = document.createElement("canvas"); cv.width = cv.height = 1024; cv.getContext("2d").drawImage(img, 0, 0); cv.toBlob((b) => NC.downloadBlob(b, `qrcode-${code}.png`), "image/png"); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  /* ---------- upload de imagem (logo/capa) ---------- */
  NC.uploadImage = async (customerId, file, kind) => {
    if (!file) return null;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use uma imagem PNG, JPG ou WEBP.");
    if (file.size > 2 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 2 MB.");
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${customerId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await NC.sb.storage.from(C.bucket).upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (error) throw error;
    return path;
  };

  /* ---------- sessão / perfil ---------- */
  NC.getProfile = async () => {
    const { data: { session } } = await NC.sb.auth.getSession();
    if (!session) return null;
    const { data } = await NC.sb.from("nc_profiles").select("*").eq("id", session.user.id).maybeSingle();
    return { session, user: session.user, profile: data };
  };

  /* ---------- login por TELEFONE + PIN (4 números) ----------
     Mesma regra da Edge Function nc-admin: e-mail interno + senha que combina PIN e telefone. */
  NC.phoneDigits = (p) => { let d = NC.digits(p); if (d.length >= 10 && d.length <= 11) d = "55" + d; return d; };
  NC.validPhone = (d) => /^55\d{10,11}$/.test(d);
  NC.authFromPhone = (phone, pin) => { const d = NC.phoneDigits(phone); return { email: `${d}@tel.nexcube3d.com.br`, password: `NC#${pin}#${d}` }; };
  NC.fmtPhone = (d) => { d = NC.digits(d).replace(/^55/, ""); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
  NC.maskPhone = (input) => input.addEventListener("input", () => { const pos = input.value.length; input.value = NC.fmtPhone(input.value.slice(0, 16)); });
  NC.pinInput = (name, label) => `<label>${label}<input name="${name}" type="password" inputmode="numeric" pattern="\\d{4}" maxlength="4" minlength="4" required autocomplete="off" placeholder="••••" style="letter-spacing:.5em;font-size:1.2rem;max-width:160px"></label>`;
  /* valida pares "repita" (telefone e PIN) de um formulário */
  NC.checkPhonePin = (f, { phone = "phone", phone2 = "phone2", pin = "pin", pin2 = "pin2", needPin = true } = {}) => {
    const d = NC.phoneDigits(f[phone].value);
    if (!NC.validPhone(d)) { NC.toast("Telefone inválido. Use DDD + número.", "err"); return null; }
    if (f[phone2] && NC.phoneDigits(f[phone2].value) !== d) { NC.toast("Os telefones não conferem. Digite novamente.", "err"); return null; }
    if (!needPin && !f[pin].value) return { phone: d, pin: null };
    if (!/^\d{4}$/.test(f[pin].value)) { NC.toast("O PIN deve ter exatamente 4 números.", "err"); return null; }
    if (f[pin2] && f[pin2].value !== f[pin].value) { NC.toast("Os PINs não conferem. Digite novamente.", "err"); return null; }
    return { phone: d, pin: f[pin].value };
  };

  NC.renderLogin = (root, { title, subtitle, onDone, extra }) => {
    root.innerHTML = `<div class="auth">
      <div class="auth-card">
        <div class="auth-brand"><img src="/assets/logo-cube.png" alt=""><div><b>NEX<span>CUBE</span> 3D</b><small>${NC.esc(subtitle || "")}</small></div></div>
        <h1>${NC.esc(title)}</h1>
        <form id="fLogin" class="stack">
          <label>Telefone (WhatsApp)<input name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="(41) 99999-9999"></label>
          ${NC.pinInput("pin", "Senha (PIN de 4 números)")}
          <button class="btn primary block">Entrar</button>
          <button type="button" class="link-btn" id="forgot">Esqueci meu PIN</button></form>
        ${extra || ""}
      </div></div>`;
    const fl = NC.$("#fLogin", root);
    NC.maskPhone(fl.phone);
    fl.onsubmit = async (e) => {
      e.preventDefault();
      const ok = NC.checkPhonePin(fl, { phone2: "_", pin2: "_" }); if (!ok) return;
      const btn = NC.$("button", fl); btn.disabled = true;
      const { error } = await NC.sb.auth.signInWithPassword(NC.authFromPhone(ok.phone, ok.pin));
      btn.disabled = false;
      if (error) return NC.toast(/rate|many/i.test(error.message) ? "Muitas tentativas. Aguarde alguns minutos." : "Telefone ou PIN incorretos.", "err");
      onDone();
    };
    NC.$("#forgot", root).onclick = () => NC.modal({
      title: "Esqueci meu PIN",
      body: `<p class="muted">A Nexcube 3D cadastra um novo PIN para você na hora. É só pedir pelo WhatsApp.</p>
             <a class="btn primary block" style="margin-top:1rem" target="_blank" rel="noopener" href="${NC.waLink(C.nexcubeWhatsapp, "Olá! Esqueci o PIN do meu painel Nexcube 3D.")}">${NC.icon("whatsapp")} Pedir novo PIN no WhatsApp</a>`,
      actions: [{ label: "Fechar", cls: "ghost" }]
    });
  };

  /* Trocar o próprio PIN (usuário logado) */
  NC.changePin = (phone) => NC.modal({
    title: "Trocar meu PIN",
    body: `<form class="stack" id="fPin">${NC.pinInput("pin", "Novo PIN (4 números)")}${NC.pinInput("pin2", "Repita o novo PIN")}</form>`,
    actions: [{ label: "Cancelar", cls: "ghost" }, { label: "Salvar novo PIN", cls: "primary", onClick: async (w) => {
      const f = NC.$("#fPin", w);
      if (!/^\d{4}$/.test(f.pin.value)) { NC.toast("O PIN deve ter 4 números.", "err"); return false; }
      if (f.pin.value !== f.pin2.value) { NC.toast("Os PINs não conferem.", "err"); return false; }
      const { error } = await NC.sb.auth.updateUser({ password: NC.authFromPhone(phone, f.pin.value).password });
      if (error) { NC.err(error); return false; }
      NC.toast("PIN alterado!");
    } }]
  });
  NC.userPhone = (user) => (user && user.email ? user.email.split("@")[0] : "");

  /* Gráfico de barras simples por dia */
  NC.barChart = (el, rows, label = "acessos") => {
    const max = Math.max(1, ...rows.map((r) => r.v));
    el.innerHTML = rows.length ? `<div class="bars">${rows.map((r) => `<div class="bar" title="${NC.esc(r.k)}: ${r.v} ${label}"><i style="height:${Math.max(2, (r.v / max) * 100)}%"></i><span>${NC.esc(r.s || "")}</span></div>`).join("")}</div>`
      : `<div class="empty">Ainda não há dados neste período.</div>`;
  };
  NC.daySeries = (events, days) => {
    const map = {}; const out = [];
    events.forEach((e) => { const k = e.created_at.slice(0, 10); map[k] = (map[k] || 0) + 1; });
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(12); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      out.push({ k: d.toLocaleDateString("pt-BR"), v: map[k] || 0, s: days <= 14 || i % Math.ceil(days / 10) === 0 ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "" });
    }
    return out;
  };
})();
