/**
 * Motor fiscal Bizkaia 2026 — NÚCLEO GENERAL únicamente.
 *
 * También se reutiliza para GIPUZKOA (lib/constants-gipuzkoa-2026.js): la
 * tabla de Gipuzkoa coincide de forma exacta con la de Bizkaia (verificado
 * de forma independiente contra gipuzkoa.eus el 25/08/2026, no asumido).
 * Este motor no tiene nada hardcodeado de Bizkaia — recibe la tabla como
 * parámetro — así que compartirlo evita duplicar el algoritmo entre los
 * dos territorios; solo se duplican los datos, porque cada uno cita su
 * propia norma foral por separado.
 *
 * Implementa solo: tabla de retención por rendimiento anual + nº de
 * descendientes, y minoración por discapacidad del perceptor (art. 88
 * Reglamento IRPF Bizkaia, redacción Decreto Foral 134/2025). NO incluye
 * regularizaciones, pensión compensatoria ni casos laborales especiales —
 * quedan pendientes de validar por separado antes de añadirlos aquí.
 *
 * Pendiente confirmado en el propio art. 88.2.4º: el tipo resultante no
 * puede ser inferior al 15% en relaciones laborales especiales ni al 2% en
 * contratos de duración inferior a un año (con la excepción de que el
 * suelo del 15% NO aplica a relaciones laborales especiales de personas
 * con discapacidad). Este motor todavía no aplica esos suelos porque
 * Bizkaia aún no está conectado al selector de tipo de contrato en ninguna
 * herramienta — añadir antes de integrar tipoContrato distinto de
 * "general".
 *
 * Módulo independiente de lib/tax-engine.js (régimen común) y de
 * lib/tax-engine-navarra.js: no los modifica ni depende de ellos, aunque
 * comparte la misma forma de resultado que Navarra para poder integrarse
 * con la misma orquestación en components.js.
 *
 * Diferencia clave con Navarra: aquí la tabla usa un intervalo CERRADO en
 * ambos extremos ("desde X,01 hasta Y,00"), así que no hace falta decidir
 * si el límite es inclusivo o exclusivo — el propio dato ya lo resuelve.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/tax-engine-navarra.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TaxEngineBizkaia = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_COLUMNA_DESCENDIENTES = 6; // índice 6 = "6 o más"

  function round1(x) {
    return Math.round((x + Number.EPSILON) * 10) / 10;
  }

  function normalizarInput(input) {
    var i = input || {};
    return {
      retribucionFija: Math.max(0, Number(i.retribucionFija) || 0),
      retribucionVariablePrevisible: Math.max(0, Number(i.retribucionVariablePrevisible) || 0),
      numDescendientes: Math.min(MAX_COLUMNA_DESCENDIENTES, Math.max(0, Math.trunc(Number(i.numDescendientes) || 0))),
      discapacidad: i.discapacidad === "33-64" || i.discapacidad === "65omas" ? i.discapacidad : "ninguna"
    };
  }

  function calcularRendimientoAnual(input) {
    return input.retribucionFija + input.retribucionVariablePrevisible;
  }

  // Busca la fila cuyo intervalo cerrado [desde, hasta] contiene el
  // rendimiento. Al ser un intervalo cerrado y contiguo, siempre hay
  // exactamente una fila aplicable (el primer tramo empieza en 0).
  function buscarFilaTabla(rendimientoAnual, tabla) {
    for (var i = 0; i < tabla.length; i++) {
      if (rendimientoAnual >= tabla[i].desde && rendimientoAnual <= tabla[i].hasta) {
        return tabla[i];
      }
    }
    return null;
  }

  function obtenerTipoBase(rendimientoAnual, numDescendientes, tabla) {
    var fila = buscarFilaTabla(rendimientoAnual, tabla);
    if (!fila) return 0;
    var idx = Math.min(numDescendientes, fila.tipos.length - 1);
    return fila.tipos[idx];
  }

  // Puntos a restar por discapacidad del perceptor, según la banda de
  // rendimiento (intervalo cerrado) en la que caiga.
  function obtenerPuntosMinoracionDiscapacidad(rendimientoAnual, discapacidad, minoracionDiscapacidad) {
    if (discapacidad !== "33-64" && discapacidad !== "65omas") return 0;
    for (var i = 0; i < minoracionDiscapacidad.length; i++) {
      var banda = minoracionDiscapacidad[i];
      if (rendimientoAnual >= banda.desde && rendimientoAnual <= banda.hasta) {
        return banda.puntos[discapacidad] || 0;
      }
    }
    return 0;
  }

  function calcularTipoRetencion(inputRaw, constants) {
    var input = normalizarInput(inputRaw);
    var rendimientoAnual = calcularRendimientoAnual(input);
    var tipoBase = obtenerTipoBase(rendimientoAnual, input.numDescendientes, constants.tablaRetencion);
    var puntosMinoracionDiscapacidad = obtenerPuntosMinoracionDiscapacidad(
      rendimientoAnual,
      input.discapacidad,
      constants.minoracionDiscapacidad
    );
    var tipoRetencion = Math.max(0, round1(tipoBase - puntosMinoracionDiscapacidad));

    return {
      rendimientoAnual: rendimientoAnual,
      numDescendientes: input.numDescendientes,
      discapacidad: input.discapacidad,
      tipoBase: tipoBase,
      puntosMinoracionDiscapacidad: puntosMinoracionDiscapacidad,
      tipoRetencion: tipoRetencion
    };
  }

  return {
    normalizarInput: normalizarInput,
    calcularRendimientoAnual: calcularRendimientoAnual,
    buscarFilaTabla: buscarFilaTabla,
    obtenerTipoBase: obtenerTipoBase,
    obtenerPuntosMinoracionDiscapacidad: obtenerPuntosMinoracionDiscapacidad,
    calcularTipoRetencion: calcularTipoRetencion
  };
});
