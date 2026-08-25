"use strict";
(function () {
  App.renderNav("neto-bruto");
  App.renderRelacionadas("relacionadas", "neto-bruto");
  var form = document.getElementById("formulario");
  var result = document.getElementById("resultado");

  App.buildFormulario(form, {
    salarioLabel: "¿Cuánto quieres cobrar neto?",
    salarioHint: "Por paga, según el número de pagas que elijas abajo.",
    salarioFormatoEspanol: true,
    salarioPresets: [1200, 1500, 2000, 2500, 3000, 4000],
    placeholder: "3.000",
    defaultValue: "3.000",
    territoriosSoportadosExtra: ["navarra", "bizkaia", "gipuzkoa", "alava"]
  });

  function render(r, netoPorPaga, datos) {
    result.hidden = false;
    var resumen = App.resumenCondicionesHTML(datos, ["navarra", "bizkaia", "gipuzkoa", "alava"]);
    if (r.bloqueado) {
      result.innerHTML = resumen + App.bloqueoHTML(r.motivo);
      return;
    }
    result.innerHTML =
      resumen +
      '<div class="result-hero"><div class="label">Para cobrar ' + Fmt.money(netoPorPaga, true) + " netos necesitas aprox.</div>" +
      '<div class="value">' + Fmt.money(r.brutoAnual) + "/año</div>" +
      '<div class="sub">' + Fmt.money(r.brutoAnual / datos.numPagas, true) + " brutos por paga (" + datos.numPagas + " pagas/año)</div></div>" +
      (r.objetivoAlcanzado
        ? ""
        : '<div class="notice">No se ha encontrado un bruto que dé exactamente ese neto; el resultado es la mejor aproximación.</div>') +
      App.splitBarHTML(r.porcentajeQueLlega, "De cada 100 € brutos, te llegan " + Fmt.money(r.porcentajeQueLlega, true)) +
      '<div class="result-grid">' +
      '<div class="result-tile"><div class="t-label">Bruto por paga</div><div class="t-value">' + Fmt.money(r.brutoAnual / datos.numPagas, true) + "</div></div>" +
      '<div class="result-tile"><div class="t-label">Retención IRPF</div><div class="t-value">' + Fmt.pct(r.irpf.tipoRetencion) + "</div></div>" +
      "</div>" +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Bruto anual</span><span class="val">' + Fmt.money(r.brutoAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Seguridad Social (trabajador)</span><span class="val">−' + Fmt.money(r.segSocial.anual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Retención IRPF (' + Fmt.pct(r.irpf.tipoRetencion) + ")</span><span class=\"val\">−" + Fmt.money(r.irpf.retencionAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Neto anual resultante</span><span class="val money">' + Fmt.money(r.netoAnual, true) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">' + App.DISCLAIMER + "</p>";
  }

  function calcular() {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario < 0) {
      result.hidden = true;
      return;
    }
    var netoAnualObjetivo = datos.salario * datos.numPagas;
    if (datos.territorio === "navarra") {
      var rNavarra = App.netoToBrutoNavarra(Object.assign({}, datos, { netoAnualObjetivo: netoAnualObjetivo }));
      render(rNavarra, datos.salario, datos);
      return;
    }
    if (datos.territorio === "bizkaia") {
      var rBizkaia = App.netoToBrutoBizkaia(Object.assign({}, datos, { netoAnualObjetivo: netoAnualObjetivo }));
      render(rBizkaia, datos.salario, datos);
      return;
    }
    if (datos.territorio === "gipuzkoa") {
      var rGipuzkoa = App.netoToBrutoGipuzkoa(Object.assign({}, datos, { netoAnualObjetivo: netoAnualObjetivo }));
      render(rGipuzkoa, datos.salario, datos);
      return;
    }
    if (datos.territorio === "alava") {
      var rAlava = App.netoToBrutoAlava(Object.assign({}, datos, { netoAnualObjetivo: netoAnualObjetivo }));
      render(rAlava, datos.salario, datos);
      return;
    }
    var r = TaxEngine.netoToBruto(
      {
        netoAnualObjetivo: netoAnualObjetivo,
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
    render(r, datos.salario, datos);
  }

  form.addEventListener("app:change", calcular);
  calcular();
})();
