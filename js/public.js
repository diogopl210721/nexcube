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
          ${links.length ? links.map((l) => `<a class="pp-btn" href="${e(linkHref(l))}" target="_blank" rel="noopener nofollow" data-id="${e(l.id || "")}">
              <span class="pp-ic">${NC.icon(l.type || "custom", 20)}</span><span class="pp-t">${e(l.title)}</span></a>`).join("")
          : opts.preview ? `<div class="pp-empty">Seus links vão aparecer aqui</div>` : ""}
        </nav>
        ${info.length ? `<div class="pp-info">${info.join("")}</div>` : ""}
        <footer class="pp-foot">${e(C.footer)}</footer>
      </div>
    </div>`;

    if (opts.onClick) el.querySelectorAll(".pp-btn").forEach((a) => a.addEventListener("click", () => opts.onClick(a.dataset.id)));
    if (opts.preview) el.querySelectorAll("a").forEach((a) => a.addEventListener("click", (ev) => ev.preventDefault()));
  };
})();
