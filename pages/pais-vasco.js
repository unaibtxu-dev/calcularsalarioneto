"use strict";
(function () {
  App.renderNav("pais-vasco");
  App.renderRelacionadasContenido("relacionadas", "calc-pais-vasco");
  var form = document.getElementById("formulario");
  var result = document.getElementById("resultado");
  var faqDinamica = document.getElementById("faq-dinamica");

  // Álava, Bizkaia y Gipuzkoa comparten motor y tabla en 2026 (ver App.brutoToNetoForalPaisVasco
  // en components.js), pero cada uno mantiene su propia función pública porque cada territorio
  // cita su propia normativa foral por separado y podría necesitar reglas propias en el futuro.
  var MOTOR_POR_TERRITORIO = {
    alava: App.brutoToNetoAlava,
    bizkaia: App.brutoToNetoBizkaia,
    gipuzkoa: App.brutoToNetoGipuzkoa
  };

  App.buildFormulario(form, {
    salarioLabel: "Salario bruto anual",
    salarioHint: "Importe íntegro antes de impuestos y Seguridad Social.",
    salarioFormatoEspanol: true,
    placeholder: "30.000",
    defaultValue: "30.000",
    territoriosSoportadosExtra: ["alava", "bizkaia", "gipuzkoa"],
    territorioDefecto: "alava",
    advancedOpen: true
  });

  function render(r, datos) {
    result.hidden = false;
    var resumen = App.resumenCondicionesHTML(datos, ["alava", "bizkaia", "gipuzkoa"]);
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
      var etiquetaTerritorio = datos.territorio === "alava" ? "En Álava, " : datos.territorio === "bizkaia" ? "En Bizkaia, " : datos.territorio === "gipuzkoa" ? "En Gipuzkoa, " : "Con el territorio seleccionado, ";
      faqDinamica.textContent =
        etiquetaTerritorio + Fmt.money(r.brutoAnual, true) + " brutos al año equivalen a " + Fmt.money(r.netoAnual) +
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
    var motor = MOTOR_POR_TERRITORIO[datos.territorio];
    if (motor) {
      render(motor(datos), datos);
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

  // Tabla comparativa régimen común vs. los tres territorios vascos, para
  // varios sueldos de referencia — calculada en vivo con el mismo motor,
  // no con cifras escritas a mano. Sirve de evidencia visual de que los
  // tres territorios coinciden en 2026 (ver sección "por qué dan el mismo
  // resultado" más abajo en la página).
  var SALARIOS_COMPARATIVA = [20000, 25000, 30000, 35000, 40000, 50000];
  var tablaComparativa = document.getElementById("comparativa-tabla-body");
  if (tablaComparativa) {
    tablaComparativa.innerHTML = SALARIOS_COMPARATIVA.map(function (bruto) {
      var datosBase = { salario: bruto, numPagas: 12, situacionFamiliar: "otro", numHijos: 0, tipoContrato: "general", discapacidadPropia: "ninguna" };
      var comun = TaxEngine.brutoToNeto(
        { brutoAnual: bruto, numPagas: 12, situacionFamiliar: "otro", numHijos: 0, territorio: "comun", tipoContrato: "general" },
        Constants2026
      );
      var alava = App.brutoToNetoAlava(datosBase);
      var bizkaia = App.brutoToNetoBizkaia(datosBase);
      var gipuzkoa = App.brutoToNetoGipuzkoa(datosBase);
      return (
        "<tr><td>" + Fmt.money(bruto) + "</td>" +
        "<td>" + Fmt.pct(comun.irpf.tipoRetencion) + "</td>" +
        "<td>" + Fmt.pct(alava.irpf.tipoRetencion) + "</td>" +
        "<td>" + Fmt.pct(bizkaia.irpf.tipoRetencion) + "</td>" +
        "<td>" + Fmt.pct(gipuzkoa.irpf.tipoRetencion) + "</td></tr>"
      );
    }).join("");
  }
})();
