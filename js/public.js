/* Página pública do cliente — cartão digital premium (usada no site e como prévia ao vivo no painel) */
(function () {
  const NC = (window.NC = window.NC || {});
  const C = window.NC_CONFIG;

  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hexA = (hex, a) => { const h = String(hex || "#000000").replace("#", ""); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const shade = (hex, amt) => { const h = String(hex || "#000000").replace("#", ""); const n = parseInt(h, 16); const c = (x) => Math.max(0, Math.min(255, x)); const r = c((n >> 16) + amt), g = c(((n >> 8) & 255) + amt), b = c((n & 255) + amt); return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };

  /* texto secundário de cada botão (ex.: @usuario, domínio) */
  function subtitle(l) {
    const u = l.url || "";
    try {
      if (u.startsWith("tel:")) return NC.fmtPhone ? NC.fmtPhone(u.replace(/\D/g, "")) : u.slice(4);
      if (u.startsWith("mailto:")) return u.slice(7);
      const p = new URL(u);
      if (/wa\.me/.test(p.hostname)) return "Resposta rápida no WhatsApp";
      if (/instagram\.com/.test(p.hostname)) return "@" + p.pathname.replace(/\//g, "");
      if (/tiktok\.com/.test(p.hostname)) return p.pathname.replace(/\//g, "");
      if (/maps|goo\.gl/.test(u)) return "Ver no mapa";
      return p.hostname.replace(/^www\./, "");
    } catch (e) { return ""; }
  }

  NC.renderPublic = (el, data, opts = {}) => {
    const e = NC.esc;
    const primary = data.primary_color || "#7a3cff";
    const bg = data.bg_color || "#0f0e1a";
    const fg = NC.contrastText(bg);
    const dark = fg === "#ffffff";
    const btnFg = NC.contrastText(primary);
    const logo = data.logo_url || NC.fileUrl(data.logo_path);
    const cover = data.cover_url || NC.fileUrl(data.cover_path);
    const radius = { rounded: "18px", pill: "999px", square: "6px", outline: "18px" }[data.button_style] || "18px";
    const links = (data.links || []).filter((l) => l.url);
    const outline = data.button_style === "outline";
    const hasContact = data.phone || data.email;
    const pageUrl = opts.preview ? "" : location.origin + location.pathname;

    const chips = [
      data.address && `<span class="pp-chip">${NC.icon("maps", 15)} ${e(data.address)}</span>`,
      data.hours && `<span class="pp-chip">${NC.icon("clock", 15)} ${e(data.hours)}</span>`
    ].filter(Boolean).join("");

    const linkHtml = links.map((l, i) => {
      const hero = i === 0 && !outline;
      return `<a class="pp-link ${hero ? "hero" : ""}" style="--d:${(0.12 + i * 0.07).toFixed(2)}s" href="${e(l.url)}" target="_blank" rel="noopener nofollow" data-id="${e(l.id || "")}">
        <span class="pp-li">${NC.icon(l.type || "custom", 22)}</span>
        <span class="pp-lt"><b>${e(l.title)}</b><small>${e(subtitle(l))}</small></span>
        <span class="pp-go">${NC.icon("down", 18)}</span><i class="pp-shine"></i></a>`;
    }).join("");

    el.innerHTML = `
    <div class="pp2 ${dark ? "dark" : "light"} ${data.align === "left" ? "left" : ""} ${outline ? "outline" : ""}"
      style="--bg:${e(bg)};--fg:${fg};--p:${e(primary)};--p2:${e(shade(primary, dark ? 45 : -35))};--pa:${hexA(primary, 0.4)};--pa2:${hexA(primary, 0.14)};--btn-fg:${btnFg};--r:${radius}">
      <div class="pp-bgfx" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="grid"></span></div>
      ${cover ? `<div class="pp-cover" style="background-image:url('${e(cover)}')"></div>` : ""}
      <main class="pp-wrap ${cover ? "has-cover" : ""}">
        <header class="pp-head">
          <div class="pp-avatar"><span class="ring"></span><div class="in">${logo ? `<img src="${e(logo)}" alt="Logo ${e(data.name)}">` : `<span>${e(initials(data.name))}</span>`}</div></div>
          <h1>${e(data.name || "Nome da empresa")}</h1>
          ${data.short_bio ? `<p class="pp-bio">${e(data.short_bio)}</p>` : ""}
          ${chips ? `<div class="pp-chips">${chips}</div>` : ""}
        </header>
        ${data.description ? `<p class="pp-desc">${e(data.description)}</p>` : ""}
        <nav class="pp-list">
          ${linkHtml || (opts.preview ? `<div class="pp-empty2">${NC.icon("plus", 22)}<span>Seus botões vão aparecer aqui</span></div>`
            : `<div class="pp-soon2"><span class="dot"></span><b>Página em preparação</b><small>Em breve, todos os contatos de ${e(data.name)} aqui.</small></div>`)}
        </nav>
        ${opts.preview ? `<div class="pp-acts"><span class="pp-act">${NC.icon("user", 18)} Salvar contato</span><span class="pp-act">${NC.icon("custom", 18)} Compartilhar</span></div>` : `
        <div class="pp-acts">
          ${hasContact ? `<button type="button" class="pp-act" data-vcard>${NC.icon("user", 18)} Salvar contato</button>` : ""}
          <button type="button" class="pp-act" data-share>${NC.icon("custom", 18)} Compartilhar</button>
          <button type="button" class="pp-act" data-qr aria-label="Mostrar QR Code">${NC.icon("eye", 18)} QR Code</button>
        </div>`}
        ${hasContact ? `<div class="pp-contact">${data.phone ? `<a href="tel:+${e(NC.waNumber(data.phone))}">${NC.icon("phone", 15)} ${e(data.phone)}</a>` : ""}${data.email ? `<a href="mailto:${e(data.email)}">${NC.icon("email", 15)} ${e(data.email)}</a>` : ""}</div>` : ""}
        <footer class="pp-foot2"><a href="${e(C.site)}" target="_blank" rel="noopener"><img src="/assets/logo-cube.png" alt="">${e(C.footer)}</a></footer>
      </main>
    </div>`;

    if (opts.preview) { el.querySelectorAll("a").forEach((a) => a.addEventListener("click", (ev) => ev.preventDefault())); return; }

    /* luz que acompanha o dedo/mouse nos botões */
    el.querySelectorAll(".pp-link").forEach((a) => a.addEventListener("pointermove", (ev) => { const r = a.getBoundingClientRect(); a.style.setProperty("--mx", ev.clientX - r.left + "px"); a.style.setProperty("--my", ev.clientY - r.top + "px"); }));

    const vc = el.querySelector("[data-vcard]");
    if (vc) vc.onclick = () => {
      const esc = (t) => String(t || "").replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, " ");
      const lines = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + esc(data.name), "ORG:" + esc(data.name)];
      if (data.phone) lines.push("TEL;TYPE=CELL:+" + NC.waNumber(data.phone));
      if (data.email) lines.push("EMAIL:" + esc(data.email));
      if (data.address) lines.push("ADR;TYPE=WORK:;;" + esc(data.address) + ";;;;");
      lines.push("URL:" + pageUrl, "NOTE:" + esc(data.short_bio || ""), "END:VCARD");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/vcard" }));
      a.download = NC.slugify(data.name || "contato") + ".vcf"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
    };
    const sh = el.querySelector("[data-share]");
    if (sh) sh.onclick = async () => { try { if (navigator.share) await navigator.share({ title: data.name, text: data.short_bio || data.name, url: pageUrl }); else await NC.copy(pageUrl, "Link copiado!"); } catch (x) {} };
    const qb = el.querySelector("[data-qr]");
    if (qb) qb.onclick = () => {
      const m = document.createElement("div"); m.className = "pp-qrm";
      m.innerHTML = `<div class="box"><b>${e(data.name)}</b><div class="qr">${NC.qrSvg(pageUrl, 520)}</div><small>Aponte a câmera para abrir esta página</small><button type="button">Fechar</button></div>`;
      m.onclick = (ev) => { if (ev.target === m || ev.target.tagName === "BUTTON") m.remove(); };
      document.body.appendChild(m);
    };
    if (opts.onClick) el.querySelectorAll(".pp-link").forEach((a) => a.addEventListener("click", () => opts.onClick(a.dataset.id)));
  };
})();
