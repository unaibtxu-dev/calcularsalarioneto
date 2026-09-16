/**
 * Genera el HTML de una tabla de retenciones forales (Álava/Bizkaia/
 * Gipuzkoa comparten estructura: tramos de rendimiento anual x número de
 * descendientes) directamente a partir de las constantes ya validadas del
 * motor, para que ninguna página tenga que mantener una segunda copia
 * manual de la tabla que pueda desincronizarse de lib/constants-*-2026.js.
 *
 * No contiene ninguna lógica fiscal: solo formatea filas de datos que ya
 * existen (mismo patrón dual Node/navegador que el resto de lib/*.js).
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.RenderTablaRetencion = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var eur0 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Mismo criterio de etiquetado que ya usa calculadora-sueldo-neto-alava.html
  // ("Hasta X €", "A € – B €", "Más de X €"), reproducido aquí en código para
  // que cualquier tabla foral con esta misma estructura de tramos lo use
  // igual, sin volver a escribirlo a mano tramo por tramo.
  function etiquetaTramo(tramo) {
    if (tramo.desde === 0) return "Hasta " + eur0.format(tramo.hasta);
    if (tramo.hasta === Infinity) return "Más de " + eur0.format(tramo.desde - 0.01);
    return eur2.format(tramo.desde) + " – " + eur0.format(tramo.hasta);
  }

  // Navarra (lib/constants-navarra-2026.js) describe su tabla con un
  // formato distinto al de Álava/Bizkaia/Gipuzkoa: cada fila es solo
  // "more than thresholdExclusive" (límite inferior exclusivo), sin un
  // "hasta" explícito — el límite superior es el thresholdExclusive de la
  // fila siguiente (o infinito en la última). Esta función convierte ese
  // formato al mismo { desde, hasta, tipos } que ya entiende
  // tablaRetencionHTML/etiquetaTramo, incluyendo la fila implícita "hasta
  // el primer umbral, tipo 0 %" que el motor (tax-engine-navarra.js)
  // aplica cuando ninguna fila es aplicable. No inventa ningún porcentaje:
  // solo reordena los mismos valores ya validados de la constante.
  function filasDesdeUmbralesExclusivos(tablaExclusiva) {
    var numColumnas = tablaExclusiva.length > 0 ? tablaExclusiva[0].tipos.length : 0;
    var filas = [{ desde: 0, hasta: tablaExclusiva[0].thresholdExclusive, tipos: new Array(numColumnas).fill(0) }];
    for (var i = 0; i < tablaExclusiva.length; i++) {
      var siguiente = tablaExclusiva[i + 1];
      filas.push({
        desde: tablaExclusiva[i].thresholdExclusive + 0.01,
        hasta: siguiente ? siguiente.thresholdExclusive : Infinity,
        tipos: tablaExclusiva[i].tipos
      });
    }
    return filas;
  }

  // tabla: array de { desde, hasta, tipos: [...] } (formato de
  // lib/constants-alava-2026.js / bizkaia / gipuzkoa). columnas: cabeceras
  // para cada posición de "tipos" (p. ej. ["0","1","2","3","4","5","6 o más"]).
  function tablaRetencionHTML(tabla, columnas) {
    var filas = tabla
      .map(function (tramo) {
        return (
          "<tr><td>" + etiquetaTramo(tramo) + "</td>" +
          tramo.tipos.map(function (t) { return "<td>" + t + " %</td>"; }).join("") +
          "</tr>"
        );
      })
      .join("");
    var cabecera = columnas.map(function (c) { return '<th scope="col">' + c + "</th>"; }).join("");
    return (
      '<div class="tabla-scroll"><table class="tabla-sueldos"><thead><tr><th scope="col">Rendimiento anual</th>' +
      cabecera +
      "</tr></thead><tbody>" +
      filas +
      "</tbody></table></div>"
    );
  }

  return { etiquetaTramo: etiquetaTramo, tablaRetencionHTML: tablaRetencionHTML, filasDesdeUmbralesExclusivos: filasDesdeUmbralesExclusivos };
});
