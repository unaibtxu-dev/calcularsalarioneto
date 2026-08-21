"use strict";
(function () {
  App.renderNav("comparar");
  App.renderRelacionadas("relacionadas", "comparar");
  var formA = document.getElementById("formulario-a");
  var formB = document.getElementById("formulario-b");
  var result = document.getElementById("resultado");

  App.buildFormulario(formA, {
    salarioLabel: "Oferta A — bruto anual",
    salarioFormatoEspanol: true,
    placeholder: "28.000",
    defaultValue: "28.000",
    idPrefix: "oa",
    territoriosSoportadosExtra: ["navarra"]
  });
  App.buildFormulario(formB, {
    salarioLabel: "Oferta B — bruto anual",
    salarioFormatoEspanol: true,
    placeholder: "32.000",
    defaultValue: "32.000",
    idPrefix: "ob",
    territoriosSoportadosExtra: ["navarra"]
  });

  function calcularOferta(form) {
    var datos = App.leerFormulario(form);
    if (!Number.isFinite(datos.salario) || datos.salario <= 0) return { datos: datos, r: null };
    if (datos.territorio === "navarra") {
      return { datos: datos, r: App.brutoToNetoNavarra(datos) };
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
    return { datos: datos, r: r };
  }

  function tile(label, r) {
    if (!r || r.bloqueado) return '<div class="result-tile"><div class="t-label">' + label + '</div><div class="t-value">—</div></div>';
    return (
      '<div class="result-tile"><div class="t-label">' + label + "</div>" +
      '<div class="t-value">' + Fmt.money(r.netoAnual) + "</div></div>"
    );
  }

  function render(ofertaA, ofertaB) {
    var a = ofertaA.r;
    var b = ofertaB.r;
    result.hidden = false;
    var resumen =
      '<div class="resumen-condiciones">' +
      '<span class="pill">Oferta A · ' + App.resumenCondiciones(ofertaA.datos, ["navarra"]) + "</span> " +
      '<span class="pill">Oferta B · ' + App.resumenCondiciones(ofertaB.datos, ["navarra"]) + "</span>" +
      "</div>";
    if ((a && a.bloqueado) || (b && b.bloqueado)) {
      result.innerHTML = resumen + App.bloqueoHTML((a && a.motivo) || (b && b.motivo));
      return;
    }
    if (!a || !b) {
      result.innerHTML = resumen + '<p class="disclaimer">Rellena ambas ofertas para comparar.</p>';
      return;
    }
    var diffAnual = TaxEngine.round(b.netoAnual - a.netoAnual);
    var diffPct = a.netoAnual > 0 ? TaxEngine.round((diffAnual / a.netoAnual) * 100) : 0;
    var mejor = diffAnual >= 0 ? "B" : "A";
    var diffClase = diffAnual >= 0 ? "diff-positive" : "diff-negative";

    result.innerHTML =
      resumen +
      '<div class="result-grid">' + tile("Neto anual A", a) + tile("Neto anual B", b) + "</div>" +
      '<div class="result-hero"><div class="label">Diferencia neta anual (B − A)</div>' +
      '<div class="value ' + diffClase + '">' + (diffAnual >= 0 ? "+" : "") + Fmt.money(diffAnual) + "</div>" +
      '<div class="sub">' + (diffAnual >= 0 ? "+" : "") + Fmt.pct(diffPct) + " · la oferta " + mejor + " da más neto al año</div></div>" +
      '<div class="breakdown">' +
      '<div class="breakdown-row"><span class="name">Neto/mes A (' + a.numPagas + " pagas)</span><span class=\"val\">" + Fmt.money(a.netoPorPaga, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Neto/mes B (' + b.numPagas + " pagas)</span><span class=\"val\">" + Fmt.money(b.netoPorPaga, true) + "</span></div>" +
      '<div class="breakdown-row"><span class="name">Retención IRPF A / B</span><span class="val">' + Fmt.pct(a.irpf.tipoRetencion) + " / " + Fmt.pct(b.irpf.tipoRetencion) + "</span></div>" +
      "</div>" +
      '<p class="disclaimer">Ambas ofertas usan el mismo motor de cálculo, así que la comparación relativa es fiable aunque cada cifra absoluta sea una retención estimada. ' + App.DISCLAIMER + "</p>";
  }

  function calcular() {
    render(calcularOferta(formA), calcularOferta(formB));
  }

  formA.addEventListener("app:change", calcular);
  formB.addEventListener("app:change", calcular);
  calcular();
})();
