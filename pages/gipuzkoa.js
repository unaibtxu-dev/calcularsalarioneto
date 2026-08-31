"use strict";
(function () {
  App.renderNav("gipuzkoa");
  App.renderRelacionadas("relacionadas");
  var form = document.getElementById("formulario");
  var result = document.getElementById("resultado");
  var faqDinamica = document.getElementById("faq-dinamica");

  App.buildFormulario(form, {
    salarioLabel: "Salario bruto anual",
    salarioHint: "Importe íntegro antes de impuestos y Seguridad Social.",
    salarioFormatoEspanol: true,
    placeholder: "30.000",
    defaultValue: "30.000",
    territoriosSoportadosExtra: ["gipuzkoa"],
    territorioDefecto: "gipuzkoa"
  });

  function render(r, datos) {
    result.hidden = false;
    var resumen = App.resumenCondicionesHTML(datos, ["gipuzkoa"]);
    if (r.bloqueado) {
      result.innerHTML = resumen + App.bloqueoHTML(r.motivo);
      if (faqDinamica) faqDinamica.textContent = "Con el territorio elegido no podemos dar una cifra fiable (" + r.motivo + ").";
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
      '<div class="breakdown-row"><span class="name">Retención IRPF (' + Fmt.pct(r.irpf.tipoRetencion) + ")</span><span class=\"val\">−" + Fmt.money(r.irpf.retencionAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Neto anual</span><span class="val money">' + Fmt.money(r.netoAnual, true) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">' + App.DISCLAIMER + "</p>";

    if (faqDinamica) {
      faqDinamica.textContent =
        (datos.territorio === "gipuzkoa" ? "En Gipuzkoa, " : "Con el territorio seleccionado, ") +
        Fmt.money(r.brutoAnual, true) + " brutos al año equivalen a " + Fmt.money(r.netoAnual) +
        " netos, unos " + Fmt.money(r.netoPorPaga, true) + " por paga (" + datos.numPagas +
        " pagas), con una retención del " + Fmt.pct(r.irpf.tipoRetencion) + ".";
    }
  }

  function calcular() {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario <= 0) {
      result.hidden = true;
      return;
    }
    // Gipuzkoa usa el motor foral (el mismo que Bizkaia, tabla idéntica); el
    // resto de territorios siguen con el común, para que el selector siga
    // siendo útil sin duplicar reglas fiscales.
    if (datos.territorio === "gipuzkoa") {
      render(App.brutoToNetoGipuzkoa(datos), datos);
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
