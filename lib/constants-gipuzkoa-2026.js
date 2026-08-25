/**
 * Constantes de retención IRPF Gipuzkoa 2026 — NÚCLEO GENERAL únicamente
 * (tabla por rendimiento anual + descendientes, y minoración por
 * discapacidad).
 *
 * IMPORTANTE: la tabla de Gipuzkoa coincide de forma EXACTA con la de
 * Bizkaia (mismos umbrales, mismos tipos, misma tabla de discapacidad),
 * verificado de forma independiente el 25/08/2026 leyendo directamente las
 * páginas oficiales de gipuzkoa.eus, sin copiar el archivo de Bizkaia.
 * No es una suposición de coordinación foral: se comprobaron 14 filas de
 * la tabla general (incluida la última, "236.060,01 en adelante") y la
 * tabla de discapacidad completa, una a una.
 *
 * Además, a diferencia de Bizkaia, aquí SÍ hay dos ejemplos oficiales
 * resueltos por la propia Hacienda Foral de Gipuzkoa que sirven de
 * validación cruzada (ver test/tax-engine-gipuzkoa.test.js, bloque
 * "validación oficial"), y ambos coinciden exactos con esta tabla.
 *
 * Por compartir estructura y algoritmo con Bizkaia, esta constante se usa
 * junto con lib/tax-engine-bizkaia.js (el motor no tiene nada específico
 * de Bizkaia: recibe la tabla como parámetro), evitando duplicar la lógica
 * de cálculo. Solo se duplican los DATOS, porque cada territorio tiene su
 * propia norma y su propia fuente que citar por separado.
 *
 * Fuente: Norma Foral 3/2014, de 17 de enero, del IRPF del Territorio
 * Histórico de Gipuzkoa; Decreto Foral 33/2014, de 14 de octubre (Reglamento
 * del IRPF). Tabla y reglas 2026 publicadas en gipuzkoa.eus.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/constants-bizkaia-2026.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ConstantsGipuzkoa2026 = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ConstantsGipuzkoa2026 = {
    TAX_YEAR: 2026,

    // Intervalo CERRADO [desde, hasta], igual formato que Bizkaia. Idéntica
    // a la tabla de Bizkaia, verificada por separado contra gipuzkoa.eus.
    tablaRetencion: [
      { desde: 0, hasta: 20000, tipos: [0, 0, 0, 0, 0, 0, 0] },
      { desde: 20000.01, hasta: 20510, tipos: [7, 5, 3, 0, 0, 0, 0] },
      { desde: 20510.01, hasta: 21300, tipos: [8, 6, 4, 1, 0, 0, 0] },
      { desde: 21300.01, hasta: 22150, tipos: [9, 7, 5, 2, 0, 0, 0] },
      { desde: 22150.01, hasta: 23220, tipos: [10, 9, 7, 4, 0, 0, 0] },
      { desde: 23220.01, hasta: 24050, tipos: [11, 10, 8, 5, 1, 0, 0] },
      { desde: 24050.01, hasta: 25410, tipos: [12, 11, 9, 6, 3, 0, 0] },
      { desde: 25410.01, hasta: 27440, tipos: [13, 12, 10, 7, 4, 0, 0] },
      { desde: 27440.01, hasta: 29790, tipos: [14, 13, 11, 9, 6, 2, 0] },
      { desde: 29790.01, hasta: 32610, tipos: [15, 14, 13, 10, 8, 4, 0] },
      { desde: 32610.01, hasta: 36350, tipos: [16, 15, 14, 12, 9, 6, 0] },
      { desde: 36350.01, hasta: 40670, tipos: [17, 16, 15, 13, 11, 8, 0] },
      { desde: 40670.01, hasta: 44560, tipos: [18, 17, 16, 15, 13, 10, 2] },
      { desde: 44560.01, hasta: 48060, tipos: [19, 18, 17, 16, 14, 12, 4] },
      { desde: 48060.01, hasta: 52020, tipos: [20, 19, 18, 17, 15, 13, 7] },
      { desde: 52020.01, hasta: 56780, tipos: [21, 20, 20, 18, 17, 15, 9] },
      { desde: 56780.01, hasta: 61820, tipos: [22, 21, 21, 20, 18, 16, 11] },
      { desde: 61820.01, hasta: 65710, tipos: [23, 22, 22, 21, 19, 18, 12] },
      { desde: 65710.01, hasta: 70080, tipos: [24, 23, 23, 22, 21, 19, 14] },
      { desde: 70080.01, hasta: 75020, tipos: [25, 25, 24, 23, 22, 20, 16] },
      { desde: 75020.01, hasta: 80730, tipos: [26, 26, 25, 24, 23, 22, 17] },
      { desde: 80730.01, hasta: 86770, tipos: [27, 27, 26, 25, 24, 23, 19] },
      { desde: 86770.01, hasta: 92190, tipos: [28, 28, 27, 26, 25, 24, 21] },
      { desde: 92190.01, hasta: 98350, tipos: [29, 29, 28, 27, 27, 25, 22] },
      { desde: 98350.01, hasta: 105380, tipos: [30, 30, 29, 29, 28, 27, 23] },
      { desde: 105380.01, hasta: 113180, tipos: [31, 31, 30, 30, 29, 28, 25] },
      { desde: 113180.01, hasta: 122030, tipos: [32, 32, 31, 31, 30, 29, 26] },
      { desde: 122030.01, hasta: 132200, tipos: [33, 33, 32, 32, 31, 30, 28] },
      { desde: 132200.01, hasta: 144140, tipos: [34, 34, 33, 33, 32, 32, 29] },
      { desde: 144140.01, hasta: 157300, tipos: [35, 35, 34, 34, 33, 33, 31] },
      { desde: 157300.01, hasta: 172280, tipos: [36, 36, 36, 35, 35, 34, 32] },
      { desde: 172280.01, hasta: 190410, tipos: [37, 37, 37, 36, 36, 35, 33] },
      { desde: 190410.01, hasta: 212820, tipos: [38, 38, 38, 37, 37, 36, 35] },
      { desde: 212820.01, hasta: 236060, tipos: [39, 39, 39, 38, 38, 37, 36] },
      { desde: 236060.01, hasta: Infinity, tipos: [40, 40, 40, 39, 39, 39, 37] }
    ],

    // Reducción por discapacidad. Situación A (33%-64% sin movilidad
    // reducida) usa la columna "33-64"; Situaciones B (33%-64% con
    // movilidad reducida agravada, según el subbaremo BLAM) y C (>=65%)
    // comparten la columna "65omas" — igual estructura que Bizkaia.
    minoracionDiscapacidad: [
      { desde: 0, hasta: 25410, puntos: { "33-64": 9, "65omas": 12 } },
      { desde: 25410.01, hasta: 32610, puntos: { "33-64": 7, "65omas": 12 } },
      { desde: 32610.01, hasta: 48060, puntos: { "33-64": 6, "65omas": 10 } },
      { desde: 48060.01, hasta: 56780, puntos: { "33-64": 5, "65omas": 10 } },
      { desde: 56780.01, hasta: 80730, puntos: { "33-64": 4, "65omas": 8 } },
      { desde: 80730.01, hasta: 122030, puntos: { "33-64": 3, "65omas": 6 } },
      { desde: 122030.01, hasta: 190410, puntos: { "33-64": 2, "65omas": 5 } },
      { desde: 190410.01, hasta: Infinity, puntos: { "33-64": 1, "65omas": 3 } }
    ]
  };

  ConstantsGipuzkoa2026.FUENTES = {
    tablaRetencion: {
      norma: "Norma Foral 3/2014, de 17 de enero, del IRPF de Gipuzkoa; Decreto Foral 33/2014, de 14 de octubre (Reglamento del IRPF)",
      articulo: "Tabla de retenciones sobre rendimientos del trabajo 2026",
      url: "https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/tabla-retenciones-rendimientos-trabajo-2026",
      anio: 2026,
      estado:
        "verificado el 25/08/2026 leyendo 14 filas de la tabla oficial de gipuzkoa.eus (incluida la última), coincidencia exacta con Bizkaia. Validado además contra 2 ejemplos oficiales resueltos por la propia Hacienda Foral (ver test/tax-engine-gipuzkoa.test.js)."
    },
    minoracionDiscapacidad: {
      norma: "Norma Foral 3/2014 / Decreto Foral 33/2014, reglas de retenciones aplicables a personas trabajadoras activas con discapacidad",
      articulo: "Retenciones aplicables a personas trabajadoras activas con discapacidad 2026",
      url: "https://www.gipuzkoa.eus/es/web/ogasuna/impuestos/retenciones/retenciones-aplicables-trabajadores-activos-discapacitados-2026",
      anio: 2026,
      estado:
        "verificado el 25/08/2026 contra el texto oficial de gipuzkoa.eus, coincidencia exacta con la tabla de Bizkaia. Validado además con el ejemplo oficial de Ainhoa (discapacidad situación A), que reproduce exactamente el 4% y el 6% del caso."
    }
  };

  return ConstantsGipuzkoa2026;
});
