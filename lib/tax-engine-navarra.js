/**
 * Motor fiscal Navarra 2026 — NÚCLEO GENERAL únicamente.
 *
 * Implementa solo: tabla de retención por rendimiento anual + nº de
 * descendientes, y minoración por discapacidad del perceptor (art. 71
 * Reglamento IRPF Navarra, redacción Decreto Foral 148/2025). NO incluye
 * regularizaciones, pensión compensatoria ni casos laborales especiales
 * (contrato <1 año, jornada incompleta) — quedan pendientes de validar por
 * separado antes de añadirlos aquí.
 *
 * Módulo independiente de lib/tax-engine.js (régimen común): no lo
 * modifica ni depende de él. Pensado para integrarse más adelante en el
 * motor principal cuando el territorio sea "navarra".
 *
 * Sobre "descendientes computables": numDescendientes debe llegar ya
 * filtrado según la definición oficial (soltero <30 años y conviviente con
 * rentas <= IPREM, o discapacidad >=33% sin límite de edad; asimilados
 * tutela/acogimiento; cómputo por cada cónyuge si ambos trabajan). Ese
 * filtrado es responsabilidad de una capa de datos/UI futura — este núcleo
 * solo recibe el recuento ya resuelto.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/tax-engine.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TaxEngineNavarra = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_COLUMNA_DESCENDIENTES = 10; // índice 10 = "10 o más"

  // Redondeo seguro a 1 decimal (precisión real de la tabla oficial) para
  // eliminar ruido de coma flotante binaria en la resta de puntos (p.ej.
  // 18.1 - 15 puede dar 3.1000000000000014 en JS). Esto NO es una regla de
  // redondeo fiscal inventada: el valor de tabla siempre tiene como máximo
  // 1 decimal y los puntos de discapacidad son enteros, así que el
  // resultado matemático exacto siempre tiene como máximo 1 decimal.
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

  // Retribución anual previsible = fijo + variable previsible. Regla dada
  // explícitamente por el usuario; no hay minoraciones ni reducciones en
  // este núcleo (a diferencia del régimen común, que sí las tiene).
  function calcularRendimientoAnual(input) {
    return input.retribucionFija + input.retribucionVariablePrevisible;
  }

  // Busca la fila de mayor thresholdExclusive tal que rendimiento > umbral.
  // Si ninguna fila cumple (rendimiento <= primer umbral), no hay fila
  // aplicable: el tipo es 0% para cualquier nº de hijos.
  function buscarFilaTabla(rendimientoAnual, tabla) {
    var filaAplicable = null;
    for (var i = 0; i < tabla.length; i++) {
      if (rendimientoAnual > tabla[i].thresholdExclusive) {
        filaAplicable = tabla[i];
      }
    }
    return filaAplicable;
  }

  function obtenerTipoBase(rendimientoAnual, numDescendientes, tabla) {
    var fila = buscarFilaTabla(rendimientoAnual, tabla);
    if (!fila) return 0;
    var idx = Math.min(numDescendientes, fila.tipos.length - 1);
    return fila.tipos[idx];
  }

  // Puntos a restar por discapacidad del perceptor, según la banda de
  // rendimiento (límite inferior EXCLUSIVO, superior INCLUSIVO) en la que
  // caiga. Si no hay discapacidad, o el rendimiento no supera 17.000 (sin
  // banda definida, tipo base ya 0), no hay minoración.
  function obtenerPuntosMinoracionDiscapacidad(rendimientoAnual, discapacidad, minoracionDiscapacidad) {
    if (discapacidad !== "33-64" && discapacidad !== "65omas") return 0;
    for (var i = 0; i < minoracionDiscapacidad.length; i++) {
      var banda = minoracionDiscapacidad[i];
      if (rendimientoAnual > banda.desdeExclusive && rendimientoAnual <= banda.hastaInclusive) {
        return banda.puntos[discapacidad] || 0;
      }
    }
    return 0;
  }

  // Tipo de retención final. El porcentaje de tabla se conserva EXACTO —
  // no hay regla oficial conocida de redondeo/truncamiento para esta vía de
  // determinación por tabla (a diferencia del régimen común, que trunca a
  // 2 decimales). Nunca negativo: se acota a 0 tras restar los puntos de
  // discapacidad.
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
