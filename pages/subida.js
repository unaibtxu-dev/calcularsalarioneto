"use strict";
(function () {
  App.renderNav("subida");
  App.renderRelacionadas("relacionadas", "subida");
  var form = document.getElementById("formulario");
  var raiseBox = document.getElementById("subida-box");
  var result = document.getElementById("resultado");

  App.buildFormulario(form, {
    salarioLabel: "Salario bruto anual actual",
    salarioFormatoEspanol: true,
    placeholder: "30.000",
    defaultValue: "30.000",
    territoriosSoportadosExtra: ["navarra", "bizkaia", "gipuzkoa"]
  });

  raiseBox.innerHTML =
    '<div class="field"><span class="field-label">Tipo de subida</span>' +
    App.segmentedHTML("tipoSubida", "Tipo de subida", [{ value: "pct", label: "% de subida" }, { value: "eur", label: "€ de subida" }], "pct") +
    "</div>" +
    '<div class="field"><label for="subida-valor" id="subida-label">Porcentaje de subida</label>' +
    '<input type="text" inputmode="decimal" id="subida-valor" value="5"></div>';

  App.wireSegmented(raiseBox);
  raiseBox.addEventListener("app:change", function () {
    var tipoSubida = raiseBox.querySelector('[data-field="tipoSubida"]').getAttribute("data-value");
    document.getElementById("subida-label").textContent = tipoSubida === "pct" ? "Porcentaje de subida" : "Subida en euros brutos/año";
    calcular();
  });
  var subidaValorEl = document.getElementById("subida-valor");
  subidaValorEl.addEventListener("input", calcular);
  subidaValorEl.addEventListener("blur", function () {
    var parsed = Fmt.parseEs(subidaValorEl.value);
    if (Number.isFinite(parsed)) subidaValorEl.value = Fmt.formatEsInput(parsed);
  });

  function calcularBruto(datos, brutoAnual) {
    if (datos.territorio === "navarra") {
      return App.brutoToNetoNavarra(Object.assign({}, datos, { salario: brutoAnual }));
    }
    if (datos.territorio === "bizkaia") {
      return App.brutoToNetoBizkaia(Object.assign({}, datos, { salario: brutoAnual }));
    }
    if (datos.territorio === "gipuzkoa") {
      return App.brutoToNetoGipuzkoa(Object.assign({}, datos, { salario: brutoAnual }));
    }
    return TaxEngine.brutoToNeto(
      {
        brutoAnual: brutoAnual,
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
  }

  function render(antes, despues, subidaBrutoAnual, datos) {
    result.hidden = false;
    var resumen = App.resumenCondicionesHTML(datos, ["navarra", "bizkaia", "gipuzkoa"]);
    if (antes.bloqueado || despues.bloqueado) {
      result.innerHTML = resumen + App.bloqueoHTML(antes.motivo || despues.motivo);
      return;
    }
    var diffNeto = TaxEngine.round(despues.netoAnual - antes.netoAnual);
    var porcentajeQueLlega = subidaBrutoAnual > 0 ? TaxEngine.round((diffNeto / subidaBrutoAnual) * 100) : 0;

    result.innerHTML =
      resumen +
      '<div class="result-hero"><div class="label">De la subida bruta, esto llega al neto</div>' +
      '<div class="value money">' + Fmt.money(diffNeto) + "/año</div>" +
      '<div class="sub">' + Fmt.pct(porcentajeQueLlega) + " de la subida bruta (" + Fmt.money(subidaBrutoAnual, true) + ") — el resto es SS + IRPF adicional</div></div>" +
      App.splitBarHTML(porcentajeQueLlega, "De cada 100 € de subida bruta, te llegan " + Fmt.money(porcentajeQueLlega, true)) +
      '<div class="result-grid">' +
      '<div class="result-tile"><div class="t-label">Neto anual actual</div><div class="t-value">' + Fmt.money(antes.netoAnual) + "</div></div>" +
      '<div class="result-tile"><div class="t-label">Neto anual con subida</div><div class="t-value money">' + Fmt.money(despues.netoAnual) + "</div></div>" +
      "</div>" +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Bruto actual → nuevo</span><span class="val">' + Fmt.money(antes.brutoAnual, true) + " → " + Fmt.money(despues.brutoAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Tipo de retención actual → nuevo</span><span class="val">' + Fmt.pct(antes.irpf.tipoRetencion) + " → " + Fmt.pct(despues.irpf.tipoRetencion) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Neto/mes actual → nuevo (' + antes.numPagas + " pagas)</span><span class=\"val\">" + Fmt.money(antes.netoPorPaga, true) + " → " + Fmt.money(despues.netoPorPaga, true) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">' + App.DISCLAIMER + "</p>";
  }

  function calcular() {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario <= 0) {
      result.hidden = true;
      return;
    }
    var tipoSubida = raiseBox.querySelector('[data-field="tipoSubida"]').getAttribute("data-value");
    var valor = Fmt.parseEs(document.getElementById("subida-valor").value);
    if (!Number.isFinite(valor)) valor = 0;
    var brutoNuevo = tipoSubida === "pct" ? datos.salario * (1 + valor / 100) : datos.salario + valor;
    var subidaBrutoAnual = brutoNuevo - datos.salario;

    var antes = calcularBruto(datos, datos.salario);
    var despues = calcularBruto(datos, brutoNuevo);
    render(antes, despues, subidaBrutoAnual, datos);
  }

  form.addEventListener("app:change", calcular);
  calcular();
})();
