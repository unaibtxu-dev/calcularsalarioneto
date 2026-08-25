"use strict";
(function () {
  App.renderNav("coste-empresa");
  App.renderRelacionadas("relacionadas", "coste-empresa");
  var form = document.getElementById("formulario");
  var atepBox = document.getElementById("atep-box");
  var personalBox = document.getElementById("personalizar-personal");
  var result = document.getElementById("resultado");

  // Solo datos que afectan al coste empresarial: salario, periodicidad,
  // tipo de contrato (cambia el tipo de desempleo) y AT/EP. Nada de
  // situación familiar/hijos aquí: eso es IRPF del trabajador, no coste SS.
  form.innerHTML =
    '<div class="field"><label for="ce-salario">Salario bruto</label>' +
    '<input type="text" inputmode="decimal" id="ce-salario" data-format="es" value="30.000" placeholder="30.000">' +
    '<div class="field-hint" id="ce-salario-hint">Importe anual, antes de impuestos y Seguridad Social.</div></div>' +
    '<div class="field"><span class="field-label">Periodicidad</span>' +
    App.segmentedHTML("periodicidad", "Periodicidad del salario", [{ value: "anual", label: "Anual" }, { value: "mensual", label: "Mensual" }], "anual") +
    "</div>" +
    '<div class="field"><label for="ce-contrato">Tipo de contrato</label>' +
    '<select id="ce-contrato">' +
    '<option value="general">General</option>' +
    '<option value="especial">Relación laboral especial</option>' +
    '<option value="duracionInferiorAno">Duración inferior a un año</option>' +
    "</select>" +
    '<div class="field-hint">Cambia el tipo de cotización por desempleo a cargo de la empresa.</div></div>';

  App.wireSegmented(form);
  form.addEventListener("app:change", function () {
    var periodicidad = form.querySelector('[data-field="periodicidad"]').getAttribute("data-value");
    document.getElementById("ce-salario-hint").textContent =
      periodicidad === "mensual" ? "Importe mensual, antes de impuestos y Seguridad Social." : "Importe anual, antes de impuestos y Seguridad Social.";
    calcular();
  });
  document.getElementById("ce-salario").addEventListener("blur", function (e) {
    var parsed = Fmt.parseEs(e.target.value);
    if (Number.isFinite(parsed)) e.target.value = Fmt.formatEsInput(parsed);
  });
  form.querySelectorAll("input, select").forEach(function (el) {
    el.addEventListener("input", calcular);
    el.addEventListener("change", calcular);
  });

  var rango = Constants2026.segSocial.atEpRangoOrientativo;
  var sugerido = (rango.oficinasAdministrativo * 100).toFixed(2);
  atepBox.innerHTML =
    '<div class="field"><label for="atep-valor">Tipo AT/EP de tu convenio (%)</label>' +
    '<input type="text" inputmode="decimal" id="atep-valor" value="' + sugerido.replace(".", ",") + '"></div>' +
    '<div class="field-hint">No existe un tipo único: depende del epígrafe CNAE de tu empresa (desde ~' +
    (rango.oficinasAdministrativo * 100).toFixed(2) + "% en oficinas hasta ~" +
    (rango.mineriaSubterranea * 100).toFixed(2) +
    '% en actividades de mayor riesgo). Consulta tu RLC o pregunta a tu gestoría para el dato exacto.</div>';
  var atepEl = document.getElementById("atep-valor");
  atepEl.addEventListener("input", calcular);
  atepEl.addEventListener("blur", function () {
    var parsed = Fmt.parseEs(atepEl.value);
    if (Number.isFinite(parsed)) atepEl.value = Fmt.formatEsInput(parsed);
  });

  personalBox.innerHTML =
    '<details class="advanced"><summary>Personalizar el neto del trabajador (opcional) <span class="chevron" aria-hidden="true">▾</span></summary>' +
    '<div class="advanced-body">' +
    '<div class="field-hint">Esto no cambia el coste para la empresa: solo afina el neto estimado del trabajador que se muestra como referencia.</div>' +
    '<div class="field"><label for="ce-sitfam">Situación familiar del trabajador</label>' +
    '<select id="ce-sitfam">' +
    '<option value="otro">Soltero/a o sin cónyuge a cargo</option>' +
    '<option value="monoparental">Familia monoparental con hijos</option>' +
    '<option value="casadoConyugeBajosIngresos">Casado/a, cónyuge con rentas ≤ 1.500 €/año</option>' +
    "</select></div>" +
    '<div class="field"><label for="ce-hijos">Hijos a cargo</label>' +
    '<input type="number" min="0" step="1" id="ce-hijos" value="0"></div>' +
    '<div class="field"><label for="ce-discapacidad">Discapacidad del trabajador</label>' +
    '<select id="ce-discapacidad">' +
    '<option value="ninguna">Sin discapacidad reconocida</option>' +
    '<option value="33-64">Discapacidad 33% - 64%</option>' +
    '<option value="65omas">Discapacidad ≥ 65%</option>' +
    "</select></div>" +
    '<div class="field"><label for="ce-territorio">Territorio</label>' +
    '<select id="ce-territorio">' +
    '<option value="comun">Régimen común</option>' +
    '<option value="ceuta">Ceuta</option>' +
    '<option value="melilla">Melilla</option>' +
    '<option value="alava">Álava (no soportado)</option>' +
    '<option value="bizkaia">Bizkaia</option>' +
    '<option value="gipuzkoa">Gipuzkoa (no soportado)</option>' +
    '<option value="navarra">Navarra</option>' +
    "</select></div>" +
    "</div></details>";
  personalBox.querySelectorAll("input, select").forEach(function (el) {
    el.addEventListener("input", calcular);
    el.addEventListener("change", calcular);
  });

  function render(neto, empresa, atepPct, brutoAnual, datosPersonal) {
    result.hidden = false;
    var totalNoSalarial = TaxEngine.round(empresa.anual);
    var costeTotal = TaxEngine.round(brutoAnual + empresa.anual);
    var resumenPersonal = '<div class="section-title">Neto del trabajador (referencia)</div>' + App.resumenCondicionesHTML(datosPersonal, ["navarra", "bizkaia"]);

    var bloqueNeto;
    if (neto.bloqueado) {
      bloqueNeto = resumenPersonal + '<div class="notice warn"><span>⚠️</span><span>No se puede estimar el neto del trabajador: ' + neto.motivo + "</span></div>";
    } else {
      var pctQueLlega = costeTotal > 0 ? TaxEngine.round((neto.netoAnual / costeTotal) * 100) : 0;
      bloqueNeto =
        resumenPersonal +
        App.splitBarHTML(pctQueLlega, "De cada 100 € que paga la empresa, el trabajador recibe " + Fmt.money(pctQueLlega, true)) +
        '<div class="result-grid">' +
        '<div class="result-tile"><div class="t-label">SS a cargo de la empresa</div><div class="t-value">' + Fmt.money(totalNoSalarial) + "</div></div>" +
        '<div class="result-tile"><div class="t-label">Neto del trabajador</div><div class="t-value money">' + Fmt.money(neto.netoAnual) + "</div></div>" +
        "</div>";
    }

    result.innerHTML =
      '<div class="result-hero"><div class="label">Coste total anual para la empresa</div>' +
      '<div class="value">' + Fmt.money(costeTotal) + "</div>" +
      '<div class="sub">' + Fmt.money(costeTotal / 12, true) + "/mes · salario bruto " + Fmt.money(brutoAnual, true) + "</div></div>" +
      bloqueNeto +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Salario bruto</span><span class="val">' + Fmt.money(brutoAnual, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Contingencias comunes + desempleo + FP + MEI + FOGASA</span><span class="val">' + Fmt.money(TaxEngine.round(empresa.anual - empresa.baseAnual * (atepPct / 100)), true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">AT/EP (' + Fmt.pct(atepPct) + ")</span><span class=\"val\">" + Fmt.money(TaxEngine.round(empresa.baseAnual * (atepPct / 100)), true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Coste total empresa</span><span class="val">' + Fmt.money(costeTotal, true) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">El tipo AT/EP es orientativo y editable: no hay un porcentaje único oficial, varía por CNAE. ' + App.DISCLAIMER + "</p>";
  }

  function calcular() {
    var salarioRaw = Fmt.parseEs(document.getElementById("ce-salario").value);
    if (!Number.isFinite(salarioRaw) || salarioRaw <= 0) {
      result.hidden = true;
      return;
    }
    var periodicidad = form.querySelector('[data-field="periodicidad"]').getAttribute("data-value");
    var brutoAnual = periodicidad === "mensual" ? salarioRaw * 12 : salarioRaw;
    var tipoContrato = document.getElementById("ce-contrato").value;
    var atepPct = Fmt.parseEs(document.getElementById("atep-valor").value);
    if (!Number.isFinite(atepPct)) atepPct = 0;

    var input = {
      brutoAnual: brutoAnual,
      numPagas: 12,
      tipoContrato: tipoContrato,
      situacionFamiliar: document.getElementById("ce-sitfam").value,
      numHijos: Number(document.getElementById("ce-hijos").value) || 0,
      discapacidadPropia: document.getElementById("ce-discapacidad").value,
      territorio: document.getElementById("ce-territorio").value
    };

    // El coste empresarial solo depende de salario, periodicidad, tipo de
    // contrato y AT/EP: se calcula sobre un input sin territorio/hijos para
    // que ninguna condición de IRPF del trabajador pueda alterarlo.
    var inputEmpresa = { brutoAnual: brutoAnual, numPagas: 12, tipoContrato: tipoContrato };
    var normalizado = TaxEngine.normalizarInput(inputEmpresa);
    var empresa = TaxEngine.calcularSegSocialEmpresa(normalizado, Constants2026, atepPct / 100);

    // Bloque secundario informativo: neto del trabajador, con motor foral
    // cuando el territorio es Navarra o Bizkaia.
    var neto;
    if (input.territorio === "navarra") {
      neto = App.brutoToNetoNavarra(Object.assign({}, input, { salario: brutoAnual }));
    } else if (input.territorio === "bizkaia") {
      neto = App.brutoToNetoBizkaia(Object.assign({}, input, { salario: brutoAnual }));
    } else {
      neto = TaxEngine.brutoToNeto(input, Constants2026);
    }

    render(neto, empresa, atepPct, brutoAnual, input);
  }

  calcular();
})();
