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

  return { etiquetaTramo: etiquetaTramo, tablaRetencionHTML: tablaRetencionHTML };
});
