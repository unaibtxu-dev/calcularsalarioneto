"use strict";
(function () {
  App.renderNav("coste-empresa");
  App.renderRelacionadas("relacionadas", "coste-empresa");
  var form = document.getElementById("formulario");
  var atepBox = document.getElementById("atep-box");
  var result = document.getElementById("resultado");

  App.buildFormulario(form, {
    salarioLabel: "Salario bruto anual del trabajador",
    placeholder: "30000",
    defaultValue: "30000"
  });

  var rango = Constants2026.segSocial.atEpRangoOrientativo;
  var sugerido = (rango.oficinasAdministrativo * 100).toFixed(2);
  atepBox.innerHTML =
    '<div class="field"><label for="atep-valor">Tipo AT/EP de tu convenio (%)</label>' +
    '<input type="number" min="0" step="0.01" inputmode="decimal" id="atep-valor" value="' + sugerido + '"></div>' +
    '<div class="field-hint">No existe un tipo único: depende del epígrafe CNAE de tu empresa (desde ~' +
    (rango.oficinasAdministrativo * 100).toFixed(2) + "% en oficinas hasta ~" +
    (rango.mineriaSubterranea * 100).toFixed(2) +
    '% en actividades de mayor riesgo). Consulta tu RLC o pregunta a tu gestoría para el dato exacto.</div>';

  document.getElementById("atep-valor").addEventListener("input", calcular);

  function render(neto, empresa, atepPct) {
    result.hidden = false;
    if (neto.bloqueado) {
      result.innerHTML = App.bloqueoHTML(neto.motivo);
      return;
    }
    var totalNoSalarial = TaxEngine.round(empresa.anual);
    var costeTotal = TaxEngine.round(neto.brutoAnual + empresa.anual);
    var pctQueLlegaAlTrabajador = costeTotal > 0 ? TaxEngine.round((neto.netoAnual / costeTotal) * 100) : 0;

    result.innerHTML =
      '<div class="result-hero"><div class="label">Coste total anual para la empresa</div>' +
      '<div class="value">' + Fmt.money(costeTotal) + "</div>" +
      '<div class="sub">' + Fmt.money(costeTotal / 12, true) + "/mes · bruto trabajador " + Fmt.money(neto.brutoAnual, true) + "</div></div>" +
      App.splitBarHTML(pctQueLlegaAlTrabajador, "De cada 100 € que paga la empresa, el trabajador recibe " + Fmt.money(pctQueLlegaAlTrabajador, true)) +
      '<div class="result-grid">' +
      '<div class="result-tile"><div class="t-label">SS a cargo de la empresa</div><div class="t-value">' + Fmt.money(totalNoSalarial) + "</div></div>" +
      '<div class="result-tile"><div class="t-label">Neto que recibe el trabajador</div><div class="t-value money">' + Fmt.money(neto.netoAnual) + "</div></div>" +
      "</div>" +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Salario bruto</span><span class="val">' + Fmt.money(neto.brutoAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Contingencias comunes + desempleo + FP + MEI + FOGASA</span><span class="val">' + Fmt.money(TaxEngine.round(empresa.anual - empresa.baseAnual * (atepPct / 100)), true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">AT/EP (' + Fmt.pct(atepPct) + ")</span><span class=\"val\">" + Fmt.money(TaxEngine.round(empresa.baseAnual * (atepPct / 100)), true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Coste total empresa</span><span class="val">' + Fmt.money(costeTotal, true) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">El tipo AT/EP es orientativo y editable: no hay un porcentaje único oficial, varía por CNAE. ' + App.DISCLAIMER + "</p>";
  }

  function calcular() {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario <= 0) {
      result.hidden = true;
      return;
    }
    var atepPct = Number(document.getElementById("atep-valor").value) || 0;
    var input = {
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
    };
    var neto = TaxEngine.brutoToNeto(input, Constants2026);
    if (neto.bloqueado) {
      render(neto, null, atepPct);
      return;
    }
    var normalizado = TaxEngine.normalizarInput(input);
    var empresa = TaxEngine.calcularSegSocialEmpresa(normalizado, Constants2026, atepPct / 100);
    render(neto, empresa, atepPct);
  }

  form.addEventListener("app:change", calcular);
  calcular();
})();
