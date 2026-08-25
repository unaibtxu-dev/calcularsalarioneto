"use strict";
(function () {
  var cfg = window.PAGINA_SALARIO || { valor: 30000, formateado: "30.000" };

  App.renderNav();
  App.renderRelacionadas("relacionadas");
  var form = document.getElementById("formulario");
  var result = document.getElementById("resultado");
  var faqDinamica = document.getElementById("faq-dinamica");

  App.buildFormulario(form, {
    salarioLabel: "Salario bruto anual",
    salarioHint: "Importe íntegro antes de impuestos y Seguridad Social.",
    salarioFormatoEspanol: true,
    placeholder: cfg.formateado,
    defaultValue: cfg.formateado,
    territoriosSoportadosExtra: ["navarra", "bizkaia"]
  });

  function pagaExtraDesglose(r, datos) {
    if (datos.numPagas !== 14 || r.bloqueado) return "";
    var pagaBruta = r.brutoAnual / 14;
    var ssMensual = r.segSocial.anual / 12;
    var retPaga = TaxEngine.round(pagaBruta * (r.irpf.tipoRetencion / 100));
    var netoOrdinaria = TaxEngine.round(pagaBruta - ssMensual - retPaga);
    var netoExtra = TaxEngine.round(pagaBruta - retPaga);
    return (
      '<div class="section-title">Cómo se reparte en 14 pagas</div>' +
      '<div class="result-grid">' +
      '<div class="result-tile"><div class="t-label">Nómina ordinaria (x12)</div><div class="t-value">' + Fmt.money(netoOrdinaria, true) + "</div></div>" +
      '<div class="result-tile"><div class="t-label">Paga extra (x2)</div><div class="t-value">' + Fmt.money(netoExtra, true) + "</div></div>" +
      "</div>" +
      '<div class="field-hint">La paga extra no lleva descuento de Seguridad Social aparte: ya se prorratea dentro de las 12 nóminas ordinarias. El total anual es el mismo que con 12 pagas.</div>'
    );
  }

  function render(r, datos) {
    result.hidden = false;
    var resumen = App.resumenCondicionesHTML(datos, ["navarra", "bizkaia"]);
    if (r.bloqueado) {
      result.innerHTML = resumen + App.bloqueoHTML(r.motivo);
      if (faqDinamica) faqDinamica.textContent = "Con el territorio elegido no podemos calcular una cifra fiable (" + r.motivo + ").";
      return;
    }
    result.innerHTML =
      resumen +
      '<div class="result-hero"><div class="label">Neto por paga estimado</div>' +
      '<div class="value money">' + Fmt.money(r.netoPorPaga, true) + "</div>" +
      '<div class="sub">' + Fmt.money(r.netoAnual) + " netos al año (" + datos.numPagas + " pagas)</div></div>" +
      App.splitBarHTML(r.porcentajeQueLlega, "De cada 100 € brutos, te llegan " + Fmt.money(r.porcentajeQueLlega, true)) +
      '<div class="result-grid">' +
      '<div class="result-tile"><div class="t-label">Retención IRPF</div><div class="t-value">' + Fmt.pct(r.irpf.tipoRetencion) + "</div></div>" +
      '<div class="result-tile"><div class="t-label">% que te llega</div><div class="t-value">' + Fmt.pct(r.porcentajeQueLlega) + "</div></div>" +
      "</div>" +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Salario bruto anual</span><span class="val">' + Fmt.money(r.brutoAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Seguridad Social (trabajador)</span><span class="val">−' + Fmt.money(r.segSocial.anual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Retención IRPF</span><span class="val">−' + Fmt.money(r.irpf.retencionAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Neto anual</span><span class="val">' + Fmt.money(r.netoAnual, true) + "</span></div>" +
      "</div>" +
      pagaExtraDesglose(r, datos) +
      '<p class="disclaimer">' + App.DISCLAIMER + "</p>";

    if (faqDinamica) {
      faqDinamica.textContent =
        "Con los datos actuales del formulario de arriba, " + Fmt.money(r.brutoAnual, true) + " brutos al año equivalen a " +
        Fmt.money(r.netoAnual) + " netos al año, unos " + Fmt.money(r.netoPorPaga, true) + " por paga (" + datos.numPagas +
        " pagas). Cambia la situación en el formulario para ver tu caso exacto.";
    }
  }

  function calcular() {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario <= 0) {
      result.hidden = true;
      return;
    }
    if (datos.territorio === "navarra") {
      render(App.brutoToNetoNavarra(datos), datos);
      return;
    }
    if (datos.territorio === "bizkaia") {
      render(App.brutoToNetoBizkaia(datos), datos);
      return;
    }
    var r = TaxEngine.brutoToNeto(
      {
        brutoAnual: datos.salario,
        numPagas: datos.numPagas,
        situacionFamiliar: datos.situacionFamiliar,
        numHijos: datos.numHijos,
        territorio: datos.territorio,
        tipoContrato: datos.tipoContrato,
        discapacidadPropia: datos.discapacidadPropia,
        edad65oMas: datos.edad65oMas,
        edad75oMas: datos.edad75oMas,
        pensionistaSS: datos.pensionistaSS,
        desempleado: datos.desempleado
      },
      Constants2026
    );
    render(r, datos);
  }

  form.addEventListener("app:change", calcular);
  calcular();
})();
