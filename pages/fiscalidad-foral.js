"use strict";
(function () {
  App.renderNav("fiscalidad-foral");
  App.renderRelacionadas("relacionadas");

  var TERRITORIOS = [
    { id: "comun", label: "Régimen común", href: "/" },
    { id: "navarra", label: "Navarra", href: "calculadora-sueldo-neto-navarra" },
    { id: "bizkaia", label: "Bizkaia", href: "calculadora-sueldo-neto-bizkaia" },
    { id: "gipuzkoa", label: "Gipuzkoa", href: "calculadora-sueldo-neto-gipuzkoa" },
    { id: "alava", label: "Álava", href: "calculadora-sueldo-neto-alava" }
  ];

  var form = document.getElementById("comparador-form");
  var salidaEl = document.getElementById("comparador-salida");
  if (!form || !salidaEl) return;

  form.innerHTML =
    '<div class="field"><label for="cf-salario">Salario bruto anual</label>' +
    '<input type="text" inputmode="decimal" id="cf-salario" data-format="es" value="30.000" placeholder="30.000"></div>' +
    '<div class="field"><label for="cf-hijos">Hijos a cargo</label>' +
    '<input type="number" min="0" step="1" id="cf-hijos" value="0"></div>' +
    '<div class="field"><span class="field-label">Pagas al año</span>' +
    App.segmentedHTML("numPagas", "Pagas al año", [{ value: "12", label: "12 pagas" }, { value: "14", label: "14 pagas" }], "12") +
    "</div>" +
    '<div class="field"><label for="cf-discapacidad">Discapacidad</label>' +
    '<select id="cf-discapacidad">' +
    '<option value="ninguna">Sin discapacidad reconocida</option>' +
    '<option value="33-64">33% - 64%</option>' +
    '<option value="65omas">65% o más</option>' +
    "</select></div>";

  App.wireSegmented(form);
  form.addEventListener("app:change", calcular);
  document.getElementById("cf-salario").addEventListener("input", calcular);
  document.getElementById("cf-salario").addEventListener("blur", function (e) {
    var parsed = Fmt.parseEs(e.target.value);
    if (Number.isFinite(parsed)) e.target.value = Fmt.formatEsInput(parsed);
  });
  document.getElementById("cf-hijos").addEventListener("input", calcular);
  document.getElementById("cf-discapacidad").addEventListener("change", calcular);

  function discapacidadLabel(v) {
    if (v === "33-64") return "discapacidad 33%-64%";
    if (v === "65omas") return "discapacidad ≥65%";
    return null;
  }

  function calcularTerritorio(id, datos) {
    if (id === "comun") {
      return TaxEngine.brutoToNeto(
        {
          brutoAnual: datos.salario,
          numPagas: datos.numPagas,
          situacionFamiliar: "otro",
          numHijos: datos.numHijos,
          discapacidadPropia: datos.discapacidadPropia,
          tipoContrato: "general"
        },
        Constants2026
      );
    }
    if (id === "navarra") return App.brutoToNetoNavarra(Object.assign({ tipoContrato: "general" }, datos));
    if (id === "bizkaia") return App.brutoToNetoBizkaia(Object.assign({ tipoContrato: "general" }, datos));
    if (id === "gipuzkoa") return App.brutoToNetoGipuzkoa(Object.assign({ tipoContrato: "general" }, datos));
    if (id === "alava") return App.brutoToNetoAlava(Object.assign({ tipoContrato: "general" }, datos));
    return null;
  }

  function calcular() {
    var salario = Fmt.parseEs(document.getElementById("cf-salario").value);
    var numHijos = Number(document.getElementById("cf-hijos").value) || 0;
    var numPagas = Number(form.querySelector('[data-field="numPagas"]').getAttribute("data-value"));
    var discapacidadPropia = document.getElementById("cf-discapacidad").value;

    if (!Number.isFinite(salario) || salario <= 0) {
      salidaEl.innerHTML = "";
      return;
    }

    var datos = { salario: salario, numHijos: numHijos, numPagas: numPagas, discapacidadPropia: discapacidadPropia };
    var resultados = TERRITORIOS.map(function (t) {
      return { t: t, r: calcularTerritorio(t.id, datos) };
    });
    var comunNeto = resultados[0].r.netoAnual;

    var condiciones = ["Soltero/a sin cónyuge a cargo", "contrato indefinido", numPagas + " pagas"];
    if (numHijos > 0) condiciones.push(numHijos + (numHijos === 1 ? " hijo" : " hijos"));
    var disc = discapacidadLabel(discapacidadPropia);
    if (disc) condiciones.push(disc);
    condiciones.push("normativa 2026");

    var html = '<div class="resumen-condiciones"><span class="pill">' + condiciones.join(" · ") + "</span></div>";
    html += '<div class="comparador-grid">';
    resultados.forEach(function (item) {
      var r = item.r;
      if (r.bloqueado) {
        html +=
          '<div class="comparador-card"><div class="comparador-card-title">' + item.t.label + "</div>" +
          '<div class="notice warn"><span>⚠️</span><span>No se puede calcular: ' + r.motivo + "</span></div>" +
          '<a class="comparador-card-link" href="' + item.t.href + '">Calculadora completa →</a></div>';
        return;
      }
      var diffAnual = TaxEngine.round(r.netoAnual - comunNeto);
      var diffTexto;
      if (item.t.id === "comun") {
        diffTexto = "Referencia";
      } else {
        var diffPct = comunNeto > 0 ? TaxEngine.round((diffAnual / comunNeto) * 100) : 0;
        diffTexto = (diffAnual >= 0 ? "+" : "") + Fmt.money(diffAnual, true) + " (" + (diffPct >= 0 ? "+" : "") + Fmt.pct(diffPct) + ")";
      }
      html +=
        '<div class="comparador-card">' +
        '<div class="comparador-card-title">' + item.t.label + "</div>" +
        '<div class="breakdown">' +
        '<div class="breakdown-row"><span class="name">Neto anual</span><span class="val money">' + Fmt.money(r.netoAnual, true) + "</span></div>" +
        '<div class="breakdown-row"><span class="name">Neto mensual</span><span class="val money">' + Fmt.money(r.netoPorPaga, true) + "</span></div>" +
        '<div class="breakdown-row"><span class="name">Retención IRPF</span><span class="val">' + Fmt.pct(r.irpf.tipoRetencion) + "</span></div>" +
        '<div class="breakdown-row"><span class="name">Diferencia</span><span class="val">' + diffTexto + "</span></div>" +
        "</div>" +
        '<a class="comparador-card-link" href="' + item.t.href + '">Calculadora completa →</a>' +
        "</div>";
    });
    html += "</div>";
    html += '<p class="field-hint">Estimación con la normativa de 2026. Tu situación real (situación familiar, tipo de contrato, discapacidad) puede cambiar el resultado — usa la calculadora completa de cada territorio para tu caso exacto.</p>';

    salidaEl.innerHTML = html;
  }

  calcular();
})();
