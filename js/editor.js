/* Editores compartilhados entre painel do cliente e /adm */
(function () {
  const NC = window.NC; const e = NC.esc; const ic = NC.icon;
  const ED = (NC.editor = {});

  ED.previewData = (c, links) => ({
    name: c.company_name, short_bio: c.short_bio, description: c.show_description ? c.description : null,
    logo_path: c.logo_path, cover_path: c.cover_path, logo_url: c._logoPreview, cover_url: c._coverPreview,
    phone: c.public_phone, email: c.public_email, address: c.public_address, hours: c.hours,
    primary_color: c.primary_color, bg_color: c.bg_color, button_style: c.button_style, align: c.align,
    links: (links || []).filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order).map((l) => ({ id: l.id, title: l.title, url: l.url, type: l.link_type }))
  });

  /* ---------------- PERFIL / MINHA PÁGINA ---------------- */
  ED.profile = (root, c, { onChange, onSaved }) => {
    root.innerHTML = `
    <form class="stack" id="fProf">
      <div class="card stack">
        <h3>${ic("user")} Identidade</h3>
        <div class="logo-up">
          <div class="lg" id="lgPrev">${c.logo_path ? `<img src="${e(NC.fileUrl(c.logo_path))}" alt="">` : "LOGO"}</div>
          <div class="stack" style="gap:.4rem">
            <b>Logo da sua empresa</b>
            <span class="muted small">PNG, JPG ou WEBP até 2 MB. De preferência quadrada.</span>
            <div class="row"><label class="btn sm">${ic("download", 16)} Enviar logo<input type="file" accept="image/png,image/jpeg,image/webp" id="logoFile" hidden></label>
            ${c.logo_path ? `<button type="button" class="btn sm ghost" id="logoRm">Remover</button>` : ""}</div>
          </div>
        </div>
        <label>Nome da empresa / profissional<input name="company_name" maxlength="120" required value="${e(c.company_name)}"></label>
        <label>Frase curta <small>(aparece abaixo do nome)</small><input name="short_bio" maxlength="160" value="${e(c.short_bio || "")}" placeholder="Ex.: Doces artesanais feitos com carinho"></label>
        <label>Descrição <small>(opcional)</small><textarea name="description" maxlength="1500" placeholder="Conte um pouco sobre o seu negócio">${e(c.description || "")}</textarea></label>
      </div>
      <div class="card stack">
        <h3>${ic("phone")} Contatos exibidos na página <small class="muted">(opcionais)</small></h3>
        <div class="grid2">
          <label>Telefone<input name="public_phone" value="${e(c.public_phone || "")}" placeholder="(41) 99999-9999"></label>
          <label>E-mail público<input name="public_email" type="email" value="${e(c.public_email || "")}" placeholder="contato@empresa.com.br"></label>
        </div>
        <label>Endereço<input name="public_address" value="${e(c.public_address || "")}" placeholder="Rua, número – bairro, cidade"></label>
        <label>Horário de atendimento<input name="hours" value="${e(c.hours || "")}" placeholder="Seg a Sex 9h–18h · Sáb 9h–13h"></label>
        <p class="muted small">Dica: WhatsApp, Instagram e outras redes você adiciona em <b>Meus links</b>.</p>
      </div>
      <div class="row"><button class="btn primary">${ic("check", 18)} Salvar alterações</button></div>
    </form>`;
    const f = NC.$("#fProf", root);
    const sync = () => { ["company_name", "short_bio", "description", "public_phone", "public_email", "public_address", "hours"].forEach((k) => (c[k] = f[k].value.trim() || null)); onChange && onChange(); };
    f.addEventListener("input", sync);
    let newLogo = null, removeLogo = false;
    NC.$("#logoFile", root).onchange = (ev) => {
      const file = ev.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) return NC.toast("A imagem deve ter no máximo 2 MB.", "err");
      newLogo = file; removeLogo = false; c._logoPreview = URL.createObjectURL(file);
      NC.$("#lgPrev", root).innerHTML = `<img src="${c._logoPreview}" alt="">`; onChange && onChange();
    };
    const rm = NC.$("#logoRm", root);
    if (rm) rm.onclick = () => { removeLogo = true; newLogo = null; c._logoPreview = null; c.logo_path = null; NC.$("#lgPrev", root).textContent = "LOGO"; onChange && onChange(); };
    f.onsubmit = async (ev) => {
      ev.preventDefault(); sync();
      if (!c.company_name) return NC.toast("Informe o nome da empresa.", "err");
      const btn = NC.$("button.primary", f); btn.disabled = true;
      try {
        const patch = { company_name: c.company_name, short_bio: c.short_bio, description: c.description, public_phone: c.public_phone, public_email: c.public_email, public_address: c.public_address, hours: c.hours };
        if (newLogo) patch.logo_path = await NC.uploadImage(c.id, newLogo, "logo");
        if (removeLogo) patch.logo_path = null;
        const { error } = await NC.sb.from("nc_customers").update(patch).eq("id", c.id);
        if (error) throw error;
        Object.assign(c, patch); newLogo = null; NC.toast("Página atualizada!"); onSaved && onSaved();
      } catch (err) { NC.err(err); } finally { btn.disabled = false; }
    };
  };

  /* ---------------- MEUS LINKS ---------------- */
  ED.links = (root, c, state, { onChange }) => {
    const draw = () => {
      const L = state.links.slice().sort((a, b) => a.sort_order - b.sort_order);
      root.innerHTML = `
      <div class="card stack">
        <div><h3 style="margin-bottom:.3rem">${ic("plus")} Adicionar um link</h3><p class="muted small">Toque no tipo de link. A gente monta o endereço certinho para você.</p></div>
        <div class="quick-add">${NC.LINK_TYPES.map((t) => `<button type="button" data-add="${t.id}">${ic(t.id, 18)} ${e(t.label)}</button>`).join("")}</div>
      </div>
      <div class="card" style="margin-top:1rem">
        <div class="row between" style="margin-bottom:.8rem"><h3 style="margin:0">Seus links (${L.length})</h3><span class="muted small">Use as setas para mudar a ordem</span></div>
        ${L.length ? `<div class="link-list">${L.map((l, i) => `
          <div class="link-item ${l.is_active ? "" : "off"}">
            <div class="li-ic">${ic(l.link_type, 20)}</div>
            <div class="li-t"><b>${e(l.title)}</b><small>${e(l.url)}</small></div>
            <div class="li-a">
              <button class="icon-btn" data-up="${l.id}" ${i === 0 ? "disabled" : ""} aria-label="Subir">${ic("up", 18)}</button>
              <button class="icon-btn" data-down="${l.id}" ${i === L.length - 1 ? "disabled" : ""} aria-label="Descer">${ic("down", 18)}</button>
              <label class="switch" title="${l.is_active ? "Visível" : "Oculto"}"><input type="checkbox" data-tog="${l.id}" ${l.is_active ? "checked" : ""}><span></span></label>
              <button class="icon-btn" data-edit="${l.id}" aria-label="Editar">${ic("edit", 18)}</button>
              <button class="icon-btn danger" data-del="${l.id}" aria-label="Excluir">${ic("trash", 18)}</button>
            </div>
          </div>`).join("")}</div>`
        : `<div class="empty">${ic("custom", 34)}Você ainda não tem links.<br>Comece pelo <b>WhatsApp</b> e pelo <b>Instagram</b> 👆</div>`}
      </div>`;
      NC.$$("[data-add]", root).forEach((b) => (b.onclick = () => openForm(null, b.dataset.add)));
      NC.$$("[data-edit]", root).forEach((b) => (b.onclick = () => openForm(state.links.find((x) => x.id === b.dataset.edit))));
      NC.$$("[data-del]", root).forEach((b) => (b.onclick = async () => {
        const l = state.links.find((x) => x.id === b.dataset.del);
        if (!(await NC.confirm("Excluir link", `Excluir o link "${l.title}"? Essa ação não pode ser desfeita.`, "Excluir"))) return;
        const { error } = await NC.sb.from("nc_links").delete().eq("id", l.id);
        if (error) return NC.err(error);
        state.links = state.links.filter((x) => x.id !== l.id); NC.toast("Link excluído."); draw(); onChange();
      }));
      NC.$$("[data-tog]", root).forEach((b) => (b.onchange = async () => {
        const l = state.links.find((x) => x.id === b.dataset.tog);
        const { error } = await NC.sb.from("nc_links").update({ is_active: b.checked }).eq("id", l.id);
        if (error) { b.checked = !b.checked; return NC.err(error); }
        l.is_active = b.checked; NC.toast(b.checked ? "Link visível na página." : "Link ocultado."); draw(); onChange();
      }));
      const move = async (id, dir) => {
        const L2 = state.links.slice().sort((a, b) => a.sort_order - b.sort_order);
        const i = L2.findIndex((x) => x.id === id), j = i + dir; if (j < 0 || j >= L2.length) return;
        [L2[i], L2[j]] = [L2[j], L2[i]]; L2.forEach((x, k) => (x.sort_order = k)); draw(); onChange();
        const res = await Promise.all([L2[i], L2[j]].map((x) => NC.sb.from("nc_links").update({ sort_order: x.sort_order }).eq("id", x.id)));
        const bad = res.find((r) => r.error); if (bad) NC.err(bad.error);
      };
      NC.$$("[data-up]", root).forEach((b) => (b.onclick = () => move(b.dataset.up, -1)));
      NC.$$("[data-down]", root).forEach((b) => (b.onclick = () => move(b.dataset.down, 1)));
    };

    const openForm = (link, typeId) => {
      const t = NC.linkType(link ? link.link_type : typeId);
      let field = "";
      const cur = link ? link.url : "";
      if (t.ask === "whatsapp") {
        const m = cur.match(/wa\.me\/(\d+)(?:\?text=(.*))?/);
        field = `<label>Número do WhatsApp<input name="wa" inputmode="tel" required placeholder="(41) 99999-9999" value="${e(m ? m[1].replace(/^55/, "") : "")}"></label>
                 <label>Mensagem inicial <small>(opcional)</small><input name="msg" placeholder="Olá! Vim pela sua página." value="${e(m && m[2] ? decodeURIComponent(m[2]) : "")}"></label>`;
      } else if (t.ask === "handle") {
        const h = cur.replace(t.base, "").replace(/^@/, "");
        field = `<label>Seu usuário<div class="input-group"><span>@</span><input name="handle" required placeholder="seuusuario" value="${e(h)}"></div></label>`;
      } else if (t.ask === "email") {
        field = `<label>E-mail<input name="email" type="email" required value="${e(cur.replace(/^mailto:/, ""))}"></label>`;
      } else if (t.ask === "phone") {
        field = `<label>Telefone<input name="phone" inputmode="tel" required placeholder="(41) 3333-3333" value="${e(cur.replace(/^tel:\+?/, ""))}"></label>`;
      } else {
        field = `<label>Endereço do link<input name="url" required placeholder="${e(t.hint || "https://")}" value="${e(cur)}"></label>`;
      }
      NC.modal({
        title: (link ? "Editar " : "Adicionar ") + t.label,
        body: `<form class="stack" id="fLink">
          <label>Texto do botão<input name="title" maxlength="60" required value="${e(link ? link.title : t.title || "")}" placeholder="Ex.: Fale com a gente"></label>
          ${field}
          <p class="muted small">${ic("eye", 16)} O visitante vê o botão com esse texto na sua página.</p></form>`,
        actions: [{ label: "Cancelar", cls: "ghost" }, {
          label: link ? "Salvar" : "Adicionar", cls: "primary", onClick: async (w) => {
            const f = NC.$("#fLink", w); if (!f.reportValidity()) return false;
            let url;
            if (t.ask === "whatsapp") { const n = NC.waNumber(f.wa.value); if (n.length < 12) { NC.toast("Número de WhatsApp inválido. Inclua o DDD.", "err"); return false; } url = NC.waLink(n, f.msg.value.trim()); }
            else if (t.ask === "handle") { const h = f.handle.value.trim().replace(/^@/, "").replace(/[^\w.]/g, ""); if (!h) return false; url = t.base + h; }
            else if (t.ask === "email") url = "mailto:" + f.email.value.trim();
            else if (t.ask === "phone") { const d = NC.digits(f.phone.value); if (d.length < 8) { NC.toast("Telefone inválido.", "err"); return false; } url = "tel:+" + NC.waNumber(d); }
            else { url = NC.normalizeUrl(f.url.value); if (!url) { NC.toast("Endereço inválido. Ex.: www.seusite.com.br", "err"); return false; } }
            const title = f.title.value.trim();
            if (link) {
              const { error } = await NC.sb.from("nc_links").update({ title, url }).eq("id", link.id);
              if (error) { NC.err(error); return false; }
              Object.assign(link, { title, url });
            } else {
              const sort = state.links.length ? Math.max(...state.links.map((x) => x.sort_order)) + 1 : 0;
              const { data, error } = await NC.sb.from("nc_links").insert({ customer_id: c.id, title, url, link_type: t.id, sort_order: sort }).select().single();
              if (error) { NC.err(error); return false; }
              state.links.push(data);
            }
            NC.toast(link ? "Link atualizado!" : "Link adicionado!"); draw(); onChange();
          }
        }]
      });
    };
    draw();
  };

  /* ---------------- APARÊNCIA ---------------- */
  const PRESETS = [
    { p: "#7a3cff", b: "#0f0e1a" }, { p: "#1f7bff", b: "#ffffff" }, { p: "#e8366b", b: "#fff5f7" }, { p: "#12a150", b: "#f2fbf5" },
    { p: "#f59e0b", b: "#1c1917" }, { p: "#111111", b: "#f5f5f4" }, { p: "#c2410c", b: "#fff7ed" }, { p: "#0e7490", b: "#ecfeff" }
  ];
  const DEFAULTS = { primary_color: "#7a3cff", bg_color: "#0f0e1a", button_style: "rounded", align: "center", show_description: true };
  ED.appearance = (root, c, { onChange, onSaved }) => {
    const draw = () => {
      root.innerHTML = `
      <form class="stack" id="fAp">
        <div class="card stack">
          <h3>${ic("paint")} Cores</h3>
          <p class="muted small">Escolha uma combinação pronta ou personalize.</p>
          <div class="swatches">${PRESETS.map((s, i) => `<button type="button" data-ps="${i}" title="Combinação ${i + 1}" style="background:linear-gradient(135deg,${s.p} 50%,${s.b} 50%)" class="${c.primary_color === s.p && c.bg_color === s.b ? "on" : ""}"></button>`).join("")}</div>
          <div class="grid2">
            <label>Cor dos botões<div class="row"><input type="color" name="primary_color" value="${e(c.primary_color)}"><span class="code">${e(c.primary_color)}</span></div></label>
            <label>Cor de fundo<div class="row"><input type="color" name="bg_color" value="${e(c.bg_color)}"><span class="code">${e(c.bg_color)}</span></div></label>
          </div>
        </div>
        <div class="card stack">
          <h3>Botões</h3>
          <div class="opts">${[["rounded", "Arredondado"], ["pill", "Cápsula"], ["square", "Reto"], ["outline", "Contorno"]].map(([v, l]) => `<label><input type="radio" name="button_style" value="${v}" ${c.button_style === v ? "checked" : ""}> ${l}</label>`).join("")}</div>
          <h3 style="margin-top:.6rem">Alinhamento</h3>
          <div class="opts">${[["center", "Centralizado"], ["left", "À esquerda"]].map(([v, l]) => `<label><input type="radio" name="align" value="${v}" ${c.align === v ? "checked" : ""}> ${l}</label>`).join("")}</div>
          <label class="row" style="font-weight:600"><input type="checkbox" name="show_description" ${c.show_description ? "checked" : ""}> Mostrar a descrição na página</label>
        </div>
        <div class="card stack">
          <h3>Foto de capa <small class="muted">(opcional)</small></h3>
          <div class="row">
            <label class="btn sm">${ic("download", 16)} Enviar capa<input type="file" accept="image/png,image/jpeg,image/webp" id="coverFile" hidden></label>
            ${c.cover_path || c._coverPreview ? `<button type="button" class="btn sm ghost" id="coverRm">Remover capa</button>` : ""}
          </div>
        </div>
        <div class="row"><button class="btn primary">${ic("check", 18)} Salvar aparência</button><button type="button" class="btn ghost" id="reset">Restaurar padrão</button></div>
      </form>`;
      const f = NC.$("#fAp", root);
      const sync = () => {
        c.primary_color = f.primary_color.value; c.bg_color = f.bg_color.value;
        c.button_style = f.button_style.value; c.align = f.align.value; c.show_description = f.show_description.checked;
        NC.$$(".code", f)[0].textContent = c.primary_color; NC.$$(".code", f)[1].textContent = c.bg_color; onChange();
      };
      f.addEventListener("input", sync);
      NC.$$("[data-ps]", f).forEach((b) => (b.onclick = () => { const s = PRESETS[b.dataset.ps]; c.primary_color = s.p; c.bg_color = s.b; draw(); onChange(); }));
      NC.$("#reset", f).onclick = () => { Object.assign(c, DEFAULTS); draw(); onChange(); };
      let newCover = null, rmCover = false;
      NC.$("#coverFile", f).onchange = (ev) => { const file = ev.target.files[0]; if (!file) return; if (file.size > 2097152) return NC.toast("Máximo 2 MB.", "err"); newCover = file; rmCover = false; c._coverPreview = URL.createObjectURL(file); onChange(); NC.toast("Capa carregada. Clique em salvar."); };
      const cr = NC.$("#coverRm", f); if (cr) cr.onclick = () => { rmCover = true; newCover = null; c._coverPreview = null; c.cover_path = null; onChange(); draw(); };
      f.onsubmit = async (ev) => {
        ev.preventDefault(); const btn = NC.$("button.primary", f); btn.disabled = true;
        try {
          const patch = { primary_color: c.primary_color, bg_color: c.bg_color, button_style: c.button_style, align: c.align, show_description: c.show_description };
          if (newCover) patch.cover_path = await NC.uploadImage(c.id, newCover, "cover");
          if (rmCover) patch.cover_path = null;
          const { error } = await NC.sb.from("nc_customers").update(patch).eq("id", c.id); if (error) throw error;
          Object.assign(c, patch); NC.toast("Aparência salva!"); onSaved && onSaved();
        } catch (err) { NC.err(err); } finally { btn.disabled = false; }
      };
    };
    draw();
  };

  /* ---------------- VITRINE DE MINI SITES (gancho de venda DDS) ---------------- */
  ED.showcase = (models, c, { admin = false } = {}) => {
    const C = window.NC_CONFIG;
    const list = (models || []).filter((m) => m && m.url);
    const name = c ? c.company_name : "";
    const hire = NC.waLink(C.dds.whatsapp, admin
      ? `Olá DDS! Sou da Nexcube 3D. O cliente ${name} quer contratar um mini site. Podemos conversar?`
      : `Olá DDS! Sou cliente Nexcube 3D (${name}) e quero contratar um mini site. Vi os modelos no meu painel.`);
    const cards = list.map((m, i) => `
      <a class="ms-card" href="${e(m.url)}" target="_blank" rel="noopener" style="--mc:${e(m.color || "#6a3bff")};--d:${i * 0.08}s">
        <div class="ms-shot"><div class="ms-bar"><i></i><i></i><i></i><span>${e((m.url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</span></div>
          <div class="ms-frame"><div class="ms-ph">${ic("globe", 34)}</div><iframe src="${e(m.url)}" loading="lazy" tabindex="-1" aria-hidden="true" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"></iframe></div></div>
        <div class="ms-info"><div><b>${e(m.title)}</b><small>${e(m.segment || "")}</small></div><span class="ms-open">Ver modelo ${ic("eye", 16)}</span></div>
      </a>`).join("");
    return `<div class="ms-show">
      <div class="ms-head">
        <div><span class="ms-kicker">${ic("sparkle", 16)} Desenvolvido pela DDS Inovação</span>
          <h2>${admin ? "Mostre ao cliente: mini sites prontos para vender" : "Seu negócio com um site profissional"}</h2>
          <p class="muted">${admin ? "Abra os modelos junto com o cliente. Gostou? Chame a DDS e, depois de pronto, cole o link abaixo." : "Veja modelos reais feitos pela DDS. Toque em um modelo para abrir."}</p></div>
      </div>
      <div class="ms-grid">${cards || `<div class="empty">Nenhum modelo cadastrado ainda.</div>`}</div>
      <div class="ms-cta">
        <a class="btn primary" href="${hire}" target="_blank" rel="noopener">${ic("whatsapp", 18)} ${admin ? "Chamar a DDS para contratar" : "Quero contratar com a DDS"}</a>
        <a class="btn" href="${e(C.dds.minisite)}" target="_blank" rel="noopener">${ic("rocket", 18)} Conhecer o Mini Site DDS</a>
        ${admin && c && c.phone ? `<a class="btn" target="_blank" rel="noopener" href="${NC.waLink(c.phone, "Olá! Separei alguns modelos de mini site profissional para você ver:\n\n" + list.map((m) => "• " + m.title + ": " + m.url).join("\n") + "\n\nGostando de algum, a DDS Inovação faz o seu sob medida.")}">${ic("whatsapp", 18)} Enviar modelos ao cliente</a>` : ""}
      </div></div>`;
  };

  /* ---------------- PASSO A PASSO: GRAVAR A TAG NFC ---------------- */
  ED.writeGuide = (code) => {
    const url = NC.tagUrl(code);
    const step = (n, t, d) => `<div class="tl cur" style="padding-bottom:1.1rem"><span class="d" style="background:var(--grad);border:0;color:#fff;font-weight:800;font-size:.8rem">${n}</span><div><b>${t}</b><small style="font-size:.84rem;margin-top:.15rem">${d}</small></div></div>`;
    NC.modal({
      title: "Como gravar a tag NFC", wide: true,
      body: `<div class="split" style="grid-template-columns:1.3fr 1fr">
        <div class="timeline">
          ${step(1, "Instale o app NFC Tools", "Gratuito, para iPhone e Android (desenvolvedor wakdev).")}
          ${step(2, "Abra o app → Gravar → Adicionar um registro", "No iPhone a aba se chama <b>Write</b>; escolha <b>URL / URI</b>.")}
          ${step(3, "Cole o endereço da tag", "Use o botão <b>Copiar</b> ao lado. Grave exatamente este endereço, sem espaços.")}
          ${step(4, "Toque em Gravar e encoste a tag no celular", "iPhone: na parte de cima, atrás. Android: no meio das costas. Segure até aparecer a confirmação.")}
          ${step(5, "Teste", "Com a tela desbloqueada, aproxime a tag: a página do cliente deve abrir. Teste também o QR Code com a câmera.")}
          ${step(6, "Opcional: bloquear a tag", "No app: Outros → Bloquear tag. É <b>permanente</b>, faça só depois de testar. Como o destino muda pelo painel, nunca será preciso regravar.")}
        </div>
        <div class="stack">
          <div class="card" style="box-shadow:none;background:var(--soft)"><span class="muted small">Endereço para gravar</span>
            <div class="url-line" style="background:#fff;margin-top:.4rem"><span><b>${e(url)}</b></span><button class="icon-btn" id="gvCopy" aria-label="Copiar">${ic("copy", 18)}</button></div>
            <div class="qr-box" style="justify-content:center;margin-top:1rem"><div class="qr">${NC.qrSvg(url, 360)}</div></div>
            <p class="muted tiny" style="text-align:center;margin-top:.5rem">O QR Code abre o mesmo endereço</p></div>
          <p class="alert info small">${ic("sparkle", 18)}<span><b>Tag recomendada:</b> NTAG213, 215 ou 216 (cabe com folga). Etiquetas metálicas precisam ser do tipo "anti-metal".</span></p>
          <p class="alert warn small">${ic("eye", 18)}<span><b>QR impresso:</b> mínimo de 2 × 2 cm, em fundo claro. Teste antes de produzir em quantidade.</span></p>
        </div></div>`,
      onOpen: (w) => (NC.$("#gvCopy", w).onclick = () => NC.copy(url, "Endereço copiado! Cole no NFC Tools.")),
      actions: [{ label: "Baixar QR (PNG)", onClick: () => { NC.downloadQr(code, "png"); return false; } }, { label: "Entendi", cls: "primary" }]
    });
  };

  /* ---------------- TAG (QR dinâmico + destino) ---------------- */
  const TYPE_LABEL = { nfc: "NFC", qr: "QR Code", nfc_qr: "NFC + QR Code" };
  ED.TYPE_LABEL = TYPE_LABEL;
  ED.DEST_LABEL = { links: "Página de links", minisite: "Mini site", custom_url: "Outro endereço" };
  ED.tagCard = (root, tag, c, { onSaved }) => {
    const url = NC.tagUrl(tag.code);
    const msOk = c.minisite_status === "published" && c.minisite_url;
    root.innerHTML = `
    <div class="card stack">
      <div class="row between"><div><h3 style="margin:0">${ic("tag")} ${e(tag.label || "Minha tag")}</h3><span class="muted small">${TYPE_LABEL[tag.tag_type]} · código <span class="code">${e(tag.code)}</span></span></div>
        <span class="badge ${tag.status === "active" ? "ok" : "bad"}">${tag.status === "active" ? "Ativa" : "Suspensa"}</span></div>
      <div class="qr-box">
        <div class="qr">${NC.qrSvg(url, 360)}</div>
        <div class="stack grow" style="gap:.6rem">
          <div class="url-line"><span>${e(url)}</span><button class="icon-btn" data-copy aria-label="Copiar endereço">${ic("copy", 18)}</button></div>
          <div class="row"><button class="btn sm" data-png>${ic("download", 16)} Baixar QR (PNG)</button><button class="btn sm" data-svg>${ic("download", 16)} SVG</button><button class="btn sm" data-gv>${ic("nfc", 16)} Como gravar a tag NFC</button></div>
          <p class="alert info small">${ic("nfc", 18)}<span><b>Esse endereço nunca muda.</b> Mudou o destino abaixo? A tag e o QR Code impressos continuam funcionando, sem regravar nada.</span></p>
        </div>
      </div>
      <h3 style="margin-top:.4rem">Para onde a tag leva?</h3>
      <form class="stack" data-dest>
        <label class="dest-opt"><input type="radio" name="d" value="links" ${tag.destination_type === "links" ? "checked" : ""}><span><b>Minha página de links</b><span class="muted small">Recomendado: mostra sua logo e todos os seus botões.</span></span></label>
        <label class="dest-opt ${msOk ? "" : "disabled"}"><input type="radio" name="d" value="minisite" ${tag.destination_type === "minisite" ? "checked" : ""} ${msOk ? "" : "disabled"}><span><b>Meu mini site</b><span class="muted small">${msOk ? e(c.minisite_url) : "Disponível quando o seu mini site estiver publicado."}</span></span></label>
        <label class="dest-opt"><input type="radio" name="d" value="custom_url" ${tag.destination_type === "custom_url" ? "checked" : ""}><span class="grow"><b>Outro endereço</b><span class="muted small">Ex.: seu cardápio online, uma promoção, um formulário.</span>
          <input name="u" placeholder="https://..." value="${e(tag.custom_url || "")}" style="margin-top:.5rem"></span></label>
        <div><button class="btn primary">${ic("check", 18)} Salvar destino</button></div>
      </form>
    </div>`;
    NC.$("[data-copy]", root).onclick = () => NC.copy(url, "Endereço da tag copiado!");
    NC.$("[data-png]", root).onclick = () => NC.downloadQr(tag.code, "png");
    NC.$("[data-svg]", root).onclick = () => NC.downloadQr(tag.code, "svg");
    NC.$("[data-gv]", root).onclick = () => ED.writeGuide(tag.code);
    const f = NC.$("[data-dest]", root);
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const d = f.d.value; let custom = null;
      if (d === "custom_url") { custom = NC.normalizeUrl(f.u.value); if (!custom || !/^https:/.test(custom)) return NC.toast("Informe um endereço válido (https://).", "err"); }
      const btn = NC.$("button.primary", f); btn.disabled = true;
      const { error } = await NC.sb.from("nc_tags").update({ destination_type: d, custom_url: custom }).eq("id", tag.id);
      btn.disabled = false;
      if (error) return NC.err(error);
      tag.destination_type = d; tag.custom_url = custom; NC.toast("Destino atualizado! A tag já leva para o novo endereço."); onSaved && onSaved();
    };
  };

  /* ---------------- ESTATÍSTICAS ---------------- */
  ED.stats = async (root, c, tags, links) => {
    let days = 30, tagFilter = "";
    const draw = async () => {
      root.innerHTML = `<div class="toolbar">
          <select id="sDays"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
          ${tags.length > 1 ? `<select id="sTag"><option value="">Todas as tags</option>${tags.map((t) => `<option value="${t.id}">${e(t.label || t.code)}</option>`).join("")}</select>` : ""}
        </div><div class="card"><div class="spin dark"></div></div>`;
      NC.$("#sDays", root).value = days; NC.$("#sDays", root).onchange = (ev) => { days = +ev.target.value; draw(); };
      const st = NC.$("#sTag", root); if (st) { st.value = tagFilter; st.onchange = (ev) => { tagFilter = ev.target.value; draw(); }; }
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const prevSince = new Date(Date.now() - 2 * days * 864e5).toISOString();
      let q = NC.sb.from("nc_events").select("event_type,link_id,tag_id,created_at,ua_category").eq("customer_id", c.id).gte("created_at", prevSince).order("created_at").limit(20000);
      if (tagFilter) q = q.eq("tag_id", tagFilter);
      const { data, error } = await q;
      if (error) return NC.err(error);
      const ev = (data || []).filter((x) => x.ua_category !== "bot");
      const cur = ev.filter((x) => x.created_at >= since), prev = ev.filter((x) => x.created_at < since);
      const views = cur.filter((x) => x.event_type === "view"), clicks = cur.filter((x) => x.event_type === "click"), scans = cur.filter((x) => x.event_type === "redirect");
      const pv = prev.filter((x) => x.event_type === "view").length;
      const diff = pv ? Math.round(((views.length - pv) / pv) * 100) : null;
      const byLink = {}; clicks.forEach((x) => (byLink[x.link_id] = (byLink[x.link_id] || 0) + 1));
      const top = Object.entries(byLink).map(([id, n]) => ({ l: links.find((l) => l.id === id), n })).filter((x) => x.l).sort((a, b) => b.n - a.n);
      const maxN = Math.max(1, ...top.map((x) => x.n));
      root.lastElementChild.outerHTML = `
        <div class="cards">
          <div class="kpi"><span>${ic("eye", 16)} Visualizações</span><b>${views.length}</b><small>${diff === null ? "sem período anterior" : (diff >= 0 ? "▲ " : "▼ ") + Math.abs(diff) + "% vs. período anterior"}</small></div>
          <div class="kpi"><span>${ic("nfc", 16)} Leituras da tag</span><b>${scans.length}</b><small>QR Code + NFC</small></div>
          <div class="kpi"><span>${ic("custom", 16)} Cliques nos links</span><b>${clicks.length}</b><small>${views.length ? Math.round((clicks.length / views.length) * 100) + "% de quem visitou" : "—"}</small></div>
        </div>
        <div class="split">
          <div class="card"><h3>Visualizações por dia</h3><div id="chart"></div></div>
          <div class="card"><h3>Links mais clicados</h3>${top.length ? `<div class="hbar">${top.map((x) => `<span>${ic(x.l.link_type, 16)} ${e(x.l.title)}</span><b>${x.n}</b><div class="tr"><i style="width:${(x.n / maxN) * 100}%"></i></div>`).join("")}</div>` : `<div class="empty">Nenhum clique ainda neste período.</div>`}</div>
        </div>
        <p class="muted tiny" style="margin-top:1rem">Os números são aproximados: pré-visualizações de aplicativos, robôs e leitores automáticos podem gerar distorções. Não coletamos dados pessoais dos visitantes.</p>`;
      NC.barChart(NC.$("#chart", root), NC.daySeries(views, days), "visualizações");
    };
    draw();
  };
})();
