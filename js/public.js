/* Renderização da página pública do cliente (usada no site e como prévia ao vivo no painel) */
(function () {
  const NC = (window.NC = window.NC || {});
  const C = window.NC_CONFIG;

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  function linkHref(l) { return l.url; }

  /* data: {name, short_bio, description, logo_path|logo_url, cover_path|cover_url, phone, whatsapp, email, address, hours,
             primary_color, bg_color, button_style, align, links:[{id,title,url,type}]} */
  NC.renderPublic = (el, data, opts = {}) => {
    const e = NC.esc;
    const primary = data.primary_color || "#7a3cff";
    const bg = data.bg_color || "#0f0e1a";
    const fg = NC.contrastText(bg);
    const btnFg = data.button_style === "outline" ? fg : NC.contrastText(primary);
    const logo = data.logo_url || NC.fileUrl(data.logo_path);
    const cover = data.cover_url || NC.fileUrl(data.cover_path);
    const radius = { rounded: "14px", pill: "999px", square: "4px", outline: "14px" }[data.button_style] || "14px";
    const links = (data.links || []).filter((l) => l.url);
    const info = [
      data.phone && `<a href="tel:${e(NC.digits(data.phone))}">${NC.icon("phone", 16)} ${e(data.phone)}</a>`,
      data.email && `<a href="mailto:${e(data.email)}">${NC.icon("email", 16)} ${e(data.email)}</a>`,
      data.address && `<span>${NC.icon("maps", 16)} ${e(data.address)}</span>`,
      data.hours && `<span>${NC.icon("clock", 16)} ${e(data.hours)}</span>`
    ].filter(Boolean);

    el.innerHTML = `
    <div class="pp ${data.align === "left" ? "left" : ""}" style="--pp-bg:${e(bg)};--pp-fg:${fg};--pp-primary:${e(primary)};--pp-btn-fg:${btnFg};--pp-radius:${radius}">
      ${cover ? `<div class="pp-cover" style="background-image:url('${e(cover)}')"></div>` : ""}
      <div class="pp-inner">
        <div class="pp-logo ${cover ? "on-cover" : ""}">${logo ? `<img src="${e(logo)}" alt="Logo ${e(data.name)}">` : `<span>${e(initials(data.name))}</span>`}</div>
        <h1 class="pp-name">${e(data.name || "Nome da empresa")}</h1>
        ${data.short_bio ? `<p class="pp-bio">${e(data.short_bio)}</p>` : ""}
        ${data.description ? `<p class="pp-desc">${e(data.description)}</p>` : ""}
        <nav class="pp-links ${data.button_style === "outline" ? "outline" : ""}">
          ${links.length ? links.map((l, i) => `<a class="pp-btn" style="animation-delay:${0.08 * i + 0.15}s" href="${e(linkHref(l))}" target="_blank" rel="noopener nofollow" data-id="${e(l.id || "")}">
              <span class="pp-ic">${NC.icon(l.type || "custom", 20)}</span><span class="pp-t">${e(l.title)}</span><span class="pp-arrow">›</span></a>`).join("")
          : opts.preview ? `<div class="pp-empty">Seus links vão aparecer aqui</div>`
          : `<div class="pp-soon"><b>Página em preparação</b><span>Em breve você encontra aqui todos os contatos de ${e(data.name)}.</span></div>`}
        </nav>
        ${!opts.preview && (data.phone || data.email || links.length) ? `<div class="pp-actions">
          ${data.phone || data.email ? `<button type="button" class="pp-act" data-vcard>${NC.icon("user", 18)} Salvar contato</button>` : ""}
          <button type="button" class="pp-act" data-share>${NC.icon("custom", 18)} Compartilhar</button></div>` : ""}
        ${info.length ? `<div class="pp-info">${info.join("")}</div>` : ""}
        <footer class="pp-foot">${e(C.footer)}</footer>
      </div>
    </div>`;

    const vc = el.querySelector("[data-vcard]");
    if (vc) vc.onclick = () => {
      const esc = (t) => String(t || "").replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, " ");
      const lines = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + esc(data.name), "ORG:" + esc(data.name)];
      if (data.phone) lines.push("TEL;TYPE=CELL:+" + NC.waNumber(data.phone));
      if (data.email) lines.push("EMAIL:" + esc(data.email));
      if (data.address) lines.push("ADR;TYPE=WORK:;;" + esc(data.address) + ";;;;");
      lines.push("URL:" + location.origin + location.pathname, "NOTE:" + esc(data.short_bio || ""), "END:VCARD");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/vcard" }));
      a.download = NC.slugify(data.name || "contato") + ".vcf"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
    };
    const sh = el.querySelector("[data-share]");
    if (sh) sh.onclick = async () => {
      const u = location.origin + location.pathname;
      try { if (navigator.share) await navigator.share({ title: data.name, text: data.short_bio || data.name, url: u }); else await NC.copy(u, "Link copiado!"); } catch (x) {}
    };
    if (opts.onClick) el.querySelectorAll(".pp-btn").forEach((a) => a.addEventListener("click", () => opts.onClick(a.dataset.id)));
    if (opts.preview) el.querySelectorAll("a").forEach((a) => a.addEventListener("click", (ev) => ev.preventDefault()));
  };
})();
