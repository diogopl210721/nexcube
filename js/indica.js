/* Página do link de indicação: www.nexcube3d.com.br/indica/CODIGO
   Mostra os mini sites DDS (30 modelos), o preço e registra o pedido com a indicação. */
(function () {
  const NC = window.NC, C = window.NC_CONFIG, e = NC.esc, ic = NC.icon;

  NC.renderIndica = async (app, code) => {
    const MS = window.NC_MS;
    const { data, error } = await NC.sb.rpc("nc_ref_info", { p_code: code });
    if (error || !data || !data.ok) {
      app.innerHTML = `<div class="pp-msg"><div><div style="font-size:2.4rem">🔗</div><h1>Link inválido</h1><p>Este link de indicação não existe ou está inativo.</p><footer>${e(C.footer)}</footer></div></div>`;
      return;
    }
    document.title = "Mini sites profissionais — DDS Inovação";
    const price = data.price != null ? Number(data.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
    const by = data.kind === "client" ? data.name : "Nexcube 3D";
    app.innerHTML = `
    <div class="ind">
      <div class="ind-bg" aria-hidden="true"><i></i><i></i></div>
      <header class="ind-top"><a href="${e(C.dds.url)}" target="_blank" rel="noopener" class="ind-brand"><span>DDS</span> Inovação</a>
        <span class="ind-by">${ic("users", 15)} Indicação de <b>${e(by)}</b></span></header>
      <section class="ind-hero">
        <span class="ind-kicker">${ic("sparkle", 15)} 30 modelos prontos por ramo</span>
        <h1>Seu negócio com um <em>site profissional</em> em poucos dias</h1>
        <p>Cardápio, serviços, fotos, mapa, avaliações e botão de WhatsApp. Bonito no celular, feito sob medida pela DDS Inovação.</p>
        <div class="ind-price">${price ? `<small>Pagamento único</small><b>${price}</b>` : `<small>Preço</small><b>sob consulta</b>`}</div>
        <div class="ind-cta"><a class="btn primary" href="#pedir">${ic("rocket", 18)} Quero o meu</a><a class="btn ghost-l" href="${e(MS.examplesUrl)}" target="_blank" rel="noopener">${ic("eye", 18)} Ver os 30 modelos</a></div>
      </section>
      <section class="ind-show"><div class="ms-frame">
        <div class="ms-frame-bar"><span class="dots"><i></i><i></i><i></i></span><span class="grow">Vitrine DDS · toque para navegar</span><a href="${e(MS.examplesUrl)}" target="_blank" rel="noopener">${ic("eye", 15)} Tela cheia</a></div>
        <iframe src="${e(MS.examplesUrl)}" title="Vitrine de mini sites DDS" loading="lazy"></iframe></div></section>
      <section class="ind-feats">
        <div>${ic("phone", 22)}<b>Feito para celular</b><span>Rápido e bonito em qualquer tela.</span></div>
        <div>${ic("whatsapp", 22)}<b>Clientes no WhatsApp</b><span>Botões que levam direto para a conversa.</span></div>
        <div>${ic("edit", 22)}<b>Você atualiza</b><span>Troque fotos, preços e textos quando quiser.</span></div>
        <div>${ic("sparkle", 22)}<b>Efeitos exclusivos</b><span>Cada ramo tem sua animação própria.</span></div>
      </section>
      <section class="ind-form" id="pedir">
        <h2>Peça o seu mini site</h2><p>Deixe seu contato: a DDS Inovação fala com você pelo WhatsApp.</p>
        <form id="fInd" class="stack">
          <label>Seu nome<input name="name" required maxlength="120" autocomplete="name"></label>
          <label>WhatsApp<input name="whats" type="tel" inputmode="tel" required placeholder="(41) 99999-9999" autocomplete="tel"></label>
          <label>Seu negócio<input name="business" maxlength="160" placeholder="Ex.: barbearia no centro de Curitiba"></label>
          <label>Modelo que mais combina<select name="model"><option value="">Ainda não sei</option>${MS.models.map((m) => `<option value="${m.id}">${e(m.full)}</option>`).join("")}</select></label>
          <button class="btn primary block">${ic("whatsapp", 18)} Enviar e falar com a DDS</button>
        </form>
        <div id="indOk" hidden class="ind-ok">${ic("check", 28)}<b>Pedido enviado!</b><span>A DDS Inovação vai te chamar no WhatsApp em breve.</span></div>
      </section>
      <footer class="ind-foot">Mini sites por <a href="${e(C.dds.url)}" target="_blank" rel="noopener">DDS Inovação</a> · indicação ${e(by)}</footer>
    </div>`;
    const f = NC.$("#fInd", app);
    NC.maskPhone(f.whats);
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const d = NC.phoneDigits(f.whats.value);
      if (!NC.validPhone(d)) return NC.toast("WhatsApp inválido. Use DDD + número.", "err");
      const btn = NC.$("button", f); btn.disabled = true;
      const { data: r, error: er } = await NC.sb.rpc("nc_ref_lead", { p_code: code, p_name: f.name.value.trim(), p_whatsapp: d, p_business: f.business.value.trim() || null, p_model: f.model.value || null });
      btn.disabled = false;
      if (er || !r || !r.ok) return NC.toast((r && r.error) || "Não foi possível enviar. Tente de novo.", "err");
      const m = MS.models.find((x) => x.id === f.model.value);
      const msg = `Olá DDS! Quero um mini site${m ? " (modelo " + m.full + ")" : ""}. Meu nome é ${f.name.value.trim()}${f.business.value.trim() ? ", " + f.business.value.trim() : ""}. Indicação: ${by} (${code}).`;
      f.hidden = true; NC.$("#indOk", app).hidden = false;
      location.href = NC.waLink(C.dds.whatsapp, msg);
    };
  };
})();
