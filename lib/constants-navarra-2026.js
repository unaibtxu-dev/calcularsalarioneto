/**
 * Constantes de retención IRPF Navarra 2026 — NÚCLEO GENERAL únicamente
 * (tabla por rendimiento anual + descendientes, y minoración por
 * discapacidad). Regularizaciones, pensión compensatoria y casos
 * laborales especiales quedan fuera hasta validarlos por separado.
 *
 * Fuente: Decreto Foral 148/2025, de 23 de diciembre, que da nueva
 * redacción al art. 71 del Reglamento del IRPF de Navarra. Vigente desde
 * el 01/01/2026. Verificado el 25/08/2026 contra el texto publicado en el
 * BON (https://bon.navarra.es/es/anuncio/-/texto/2025/260/4), fila por fila:
 * coincide de forma exacta. La corrección de errores posterior (BON
 * 2026/14/0, https://bon.navarra.es/es/anuncio/-/texto/2026/14/0) NO
 * modifica ningún valor numérico de esta tabla ni de la minoración por
 * discapacidad: solo reordena el texto y corrige referencias a artículos.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/constants-2026.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ConstantsNavarra2026 = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ConstantsNavarra2026 = {
    TAX_YEAR: 2026,

    // Cada fila es "más de <thresholdExclusive>" — límite inferior
    // EXCLUSIVO: se aplica cuando rendimientoAnual > thresholdExclusive, y
    // hasta (e incluyendo) el umbral de la fila siguiente. Por debajo del
    // primer umbral (<=17.000) el tipo es 0% para cualquier nº de hijos.
    // tipos[n] = tipo % con n descendientes computables; índice 10 = "10 o
    // más descendientes".
    tablaRetencion: [
      { thresholdExclusive: 17000, tipos: [2.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { thresholdExclusive: 18500, tipos: [4.0, 3.0, 2.0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { thresholdExclusive: 19750, tipos: [6.0, 5.0, 4.0, 2.0, 0, 0, 0, 0, 0, 0, 0] },
      { thresholdExclusive: 21250, tipos: [8.5, 7.5, 6.5, 4.5, 2.5, 0, 0, 0, 0, 0, 0] },
      { thresholdExclusive: 23250, tipos: [11.0, 10.0, 9.0, 7.0, 5.0, 2.5, 0, 0, 0, 0, 0] },
      { thresholdExclusive: 25250, tipos: [13.3, 12.0, 11.3, 8.5, 7.5, 5.5, 3.4, 0.5, 0, 0, 0] },
      { thresholdExclusive: 27500, tipos: [14.6, 13.3, 12.6, 9.9, 9.2, 7.8, 5.8, 3.8, 0.8, 0, 0] },
      { thresholdExclusive: 30250, tipos: [15.8, 14.5, 13.7, 12.4, 10.7, 8.9, 7.9, 5.9, 3.9, 0.9, 0] },
      { thresholdExclusive: 32250, tipos: [17.0, 16.0, 15.0, 13.6, 12.5, 10.8, 10.0, 8.0, 7.0, 5.0, 2.0] },
      { thresholdExclusive: 35750, tipos: [18.1, 17.1, 16.5, 14.7, 14.0, 13.3, 12.2, 10.2, 9.1, 7.1, 6.1] },
      { thresholdExclusive: 41250, tipos: [20.0, 19.0, 18.3, 16.9, 16.2, 15.5, 13.7, 12.4, 11.3, 10.2, 9.2] },
      { thresholdExclusive: 48000, tipos: [22.1, 21.5, 20.9, 18.9, 18.3, 17.7, 16.6, 15.6, 14.5, 13.4, 12.3] },
      { thresholdExclusive: 55000, tipos: [24.1, 23.5, 23.0, 22.0, 21.5, 20.9, 19.8, 18.7, 17.7, 16.6, 15.0] },
      { thresholdExclusive: 62000, tipos: [26.1, 25.5, 24.5, 24.0, 23.5, 22.9, 21.9, 21.4, 19.8, 18.7, 17.2] },
      { thresholdExclusive: 69250, tipos: [28.3, 27.7, 27.0, 26.6, 25.5, 25.0, 24.4, 22.9, 21.8, 20.3, 19.3] },
      { thresholdExclusive: 75250, tipos: [29.6, 29.2, 28.3, 27.3, 27.2, 26.2, 26.1, 24.5, 23.4, 22.3, 21.3] },
      { thresholdExclusive: 82250, tipos: [30.8, 30.5, 30.0, 29.4, 29.0, 28.3, 27.7, 26.6, 25.6, 24.5, 23.9] },
      { thresholdExclusive: 94750, tipos: [32.2, 31.7, 31.2, 30.8, 30.4, 30.0, 29.5, 28.9, 27.8, 26.8, 25.7] },
      { thresholdExclusive: 107250, tipos: [33.5, 33.0, 32.6, 32.3, 32.0, 31.5, 31.0, 30.0, 29.5, 28.5, 28.0] },
      { thresholdExclusive: 120000, tipos: [35.1, 34.8, 34.6, 34.0, 33.5, 32.9, 32.4, 31.3, 30.7, 29.7, 29.1] },
      { thresholdExclusive: 132750, tipos: [36.2, 36.0, 35.8, 35.0, 34.5, 33.9, 33.4, 32.8, 32.0, 31.0, 30.0] },
      { thresholdExclusive: 146000, tipos: [38.0, 37.5, 37.0, 36.5, 35.5, 34.9, 34.4, 34.0, 33.5, 32.0, 31.5] },
      { thresholdExclusive: 200000, tipos: [40.0, 39.8, 39.4, 39.0, 38.5, 38.0, 37.5, 35.5, 34.5, 33.7, 33.0] },
      { thresholdExclusive: 280000, tipos: [42.0, 41.5, 41.2, 40.8, 40.0, 39.5, 39.0, 37.0, 36.0, 35.2, 34.5] },
      { thresholdExclusive: 350000, tipos: [43.0, 42.9, 42.8, 42.5, 41.5, 41.0, 40.5, 38.5, 37.5, 36.7, 36.0] }
    ],

    // Minoración por discapacidad del perceptor, en PUNTOS PORCENTUALES,
    // restados del tipo obtenido de la tabla anterior (nunca por debajo de
    // 0). Bandas de rendimiento propias de esta minoración — límite
    // inferior EXCLUSIVO, superior INCLUSIVO — distintas de los umbrales de
    // la tabla general. Por debajo de 17.000 no hay banda definida (el tipo
    // base ya es 0, así que no hay nada que minorar).
    minoracionDiscapacidad: [
      { desdeExclusive: 17000, hastaInclusive: 23250, puntos: { "33-64": 5, "65omas": 15 } },
      { desdeExclusive: 23250, hastaInclusive: 41250, puntos: { "33-64": 3, "65omas": 15 } },
      { desdeExclusive: 41250, hastaInclusive: 94750, puntos: { "33-64": 2, "65omas": 8 } },
      { desdeExclusive: 94750, hastaInclusive: Infinity, puntos: { "33-64": 2, "65omas": 5 } }
    ]
  };

  Constants2026FuentesNavarra(ConstantsNavarra2026);

  function Constants2026FuentesNavarra(c) {
    c.FUENTES = {
      tablaRetencion: {
        norma: "Decreto Foral 148/2025, de 23 de diciembre (da nueva redacción al art. 71 del Reglamento del IRPF de Navarra), publicado en BON el 2025/260/4",
        articulo: "Art. 71.Uno Reglamento IRPF Navarra",
        url: "https://bon.navarra.es/es/anuncio/-/texto/2025/260/4",
        anio: 2026,
        estado: "verificado el 25/08/2026 contra el texto oficial del BON, coincidencia exacta fila por fila. La corrección de errores BON 2026/14/0 (https://bon.navarra.es/es/anuncio/-/texto/2026/14/0) no modifica ningún valor de esta tabla."
      },
      minoracionDiscapacidad: {
        norma: "Decreto Foral 148/2025, de 23 de diciembre, publicado en BON el 2025/260/4",
        articulo: "Art. 71.Uno Reglamento IRPF Navarra",
        url: "https://bon.navarra.es/es/anuncio/-/texto/2025/260/4",
        anio: 2026,
        estado: "verificado el 25/08/2026 contra el texto oficial del BON, coincidencia exacta. La corrección de errores BON 2026/14/0 no modifica ningún valor de esta escala."
      }
    };
  }

  return ConstantsNavarra2026;
});
