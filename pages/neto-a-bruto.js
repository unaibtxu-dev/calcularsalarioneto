"use strict";
(function () {
  App.renderNav("neto-bruto");
  App.renderRelacionadas("relacionadas", "neto-bruto");
  var form = document.getElementById("formulario");
  var result = document.getElementById("resultado");

  App.buildFormulario(form, {
    salarioLabel: "Neto anual que quieres cobrar",
    salarioHint: "Calculamos el bruto anual que hace falta pactar para llegar a ese neto.",
    placeholder: "24000",
    defaultValue: "24000"
  });

  function render(r, datos) {
    result.hidden = false;
    if (r.bloqueado) {
      result.innerHTML = App.bloqueoHTML(r.motivo);
      return;
    }
    result.innerHTML =
      '<div class="result-hero"><div class="label">Bruto anual necesario</div>' +
      '<div class="value">' + Fmt.money(r.brutoAnual) + "</div>" +
      '<div class="sub">' + Fmt.money(r.brutoAnual / datos.numPagas, true) + " por paga (" + datos.numPagas + " pagas/año)</div></div>" +
      (r.objetivoAlcanzado
        ? ""
        : '<div class="notice">No se ha encontrado un bruto que dé exactamente ese neto; el resultado es la mejor aproximación.</div>') +
      App.splitBarHTML(r.porcentajeQueLlega, "De cada 100 € brutos, te llegan " + Fmt.money(r.porcentajeQueLlega, true)) +
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
    var r = TaxEngine.netoToBruto(
      {
        netoAnualObjetivo: datos.salario,
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
