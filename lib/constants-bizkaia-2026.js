/**
 * Constantes de retención IRPF Bizkaia 2026 — NÚCLEO GENERAL únicamente
 * (tabla por rendimiento anual + descendientes, y minoración por
 * discapacidad). Regularizaciones, pensión compensatoria y casos laborales
 * especiales quedan fuera hasta validarlos por separado.
 *
 * A diferencia de Navarra, Bizkaia publica la tabla con intervalo CERRADO
 * en ambos extremos ("Desde X,01 Hasta Y,00"), sin la ambigüedad de
 * exclusivo/inclusivo que hubo que verificar a fondo en Navarra.
 *
 * Fuente: art. 88 del Reglamento del IRPF de Bizkaia (Decreto Foral de la
 * Diputación Foral de Bizkaia 47/2014, de 8 de abril; BOB 23/04/2014),
 * apartados 1 y 4 modificados por el Decreto Foral 134/2025, de 29 de
 * diciembre, que aprueba la tabla de retenciones vigente desde el
 * 01/01/2026. Verificado el 25/08/2026 con DOS fuentes independientes de
 * bizkaia.eus (el PDF oficial adjunto a la nota de prensa de Hacienda, y la
 * página de normativa tributaria que cita el decreto y reproduce la misma
 * tabla): coincidencia exacta entre ambas. No se ha podido leer el texto
 * íntegro del BOB porque el dominio bizkaia.eus tiene un certificado SSL
 * mal configurado que bloquea la lectura automática.
 *
 * Patrón dual Node/navegador (UMD), igual que lib/constants-2026.js.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ConstantsBizkaia2026 = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ConstantsBizkaia2026 = {
    TAX_YEAR: 2026,

    // Cada fila es un intervalo CERRADO [desde, hasta] de rendimiento anual
    // (en euros). El último tramo no tiene límite superior (hasta: Infinity).
    // tipos[n] = tipo % con n descendientes computables (0..5); índice 6 =
    // "6 o más descendientes" (columna "Más" de la tabla oficial).
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

    // Reducción por discapacidad de la persona trabajadora activa, en
    // PUNTOS PORCENTUALES restados del tipo de la tabla anterior (nunca por
    // debajo de 0). CONFIRMADO contra el texto literal del art. 88.4 del
    // Decreto Foral 47/2014 (Reglamento IRPF Bizkaia):
    //   a) grado de discapacidad >=33% y <65%.
    //   b) grado >=33% y <65% que además esté en "estado carencial de
    //      movilidad reducida" según un baremo médico específico (anexo 2
    //      del RD 1971/1999: letras A/B/C, o >=7 puntos en D/E/F/G/H).
    //   c) grado >=65%.
    // La tabla oficial agrupa b) y c) en UNA sola columna ("apartado 4.b) y
    // 4.c)"). Nuestro selector solo tiene dos opciones (33-64 / 65omas), así
    // que SIMPLIFICAMOS: 33-64 -> columna a), 65omas -> columna b)/c). Esto
    // deja sin cubrir el caso raro de alguien con grado 33%-64% que además
    // tenga movilidad reducida agravada (le correspondería la columna
    // grande, no la pequeña) — limitación conocida y aceptada, no se pide
    // ese dato adicional en el formulario.
    //
    // Los PUNTOS de esta tabla (9/12, 7/12, 6/10, 5/10, 4/8, 3/6, 2/5, 1/3)
    // coinciden exactos entre el texto base del art. 88 (con umbrales de
    // 2014, sin actualizar) y la tabla 2026 ya verificada por dos fuentes de
    // bizkaia.eus — los UMBRALES de esta constante son los actualizados
    // para 2026, no los de 2014.
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

  ConstantsBizkaia2026.FUENTES = {
    tablaRetencion: {
      norma:
        "Decreto Foral 134/2025, de 29 de diciembre, que modifica los apartados 1 y 4 del art. 88 del Reglamento del IRPF de Bizkaia (aprobado por Decreto Foral 47/2014, de 8 de abril, BOB 23/04/2014)",
      articulo: "Art. 88 Reglamento IRPF Bizkaia",
      url: "https://www.bizkaia.eus/es/normativa-tributaria/retenciones-de-trabajo (cita el decreto); tabla también verificada contra el PDF oficial adjunto a la nota de prensa de bizkaia.eus sobre la tabla de retenciones 2026",
      anio: 2026,
      estado:
        "verificado el 25/08/2026 con dos fuentes independientes de bizkaia.eus, coincidencia exacta. No se ha leído el texto íntegro del BOB (certificado SSL del dominio bloquea la lectura automática)."
    },
    minoracionDiscapacidad: {
      norma: "Decreto Foral 134/2025, de 29 de diciembre, art. 88.4 del Reglamento del IRPF de Bizkaia (aprobado por Decreto Foral 47/2014, de 8 de abril, BOB 23/04/2014)",
      articulo: "Art. 88.4 Reglamento IRPF Bizkaia",
      url: "https://www.bizkaia.eus/documents/880307/15229563/ca_47_2014.pdf",
      anio: 2026,
      estado:
        "CONFIRMADO el 25/08/2026 contra el texto literal del art. 88.4 (leído del PDF oficial del Decreto Foral 47/2014, con umbrales de 2014 sin actualizar). Los puntos de minoración coinciden exactos con la tabla 2026 ya verificada por dos fuentes; los umbrales usados aquí son los de 2026. Simplificación aceptada: el apartado 4.b) real incluye un matiz de movilidad reducida (33%-64% + baremo específico) que nuestro selector de dos opciones no distingue — ver comentario junto a la tabla."
    }
  };

  return ConstantsBizkaia2026;
});
