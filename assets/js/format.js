"use strict";
var Fmt = (function () {
  var eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var eurDec = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function money(n, decimals) {
    if (!Number.isFinite(n)) return "—";
    return decimals ? eurDec.format(n) : eur.format(n);
  }

  function pct(n) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
  }

  function num(n) {
    return Number.isFinite(n) ? n : 0;
  }

  // Acepta formato español (punto de millares, coma decimal): "3.000,50" -> 3000.5.
  // También admite texto sin formatear ("3000", "3000.5") para no romper si el
  // usuario pega un número en formato anglosajón.
  function parseEs(str) {
    if (typeof str === "number") return str;
    if (typeof str !== "string") return NaN;
    var cleaned = str.trim().replace(/[€\s]/g, "");
    if (!cleaned) return NaN;
    var lastComma = cleaned.lastIndexOf(",");
    var lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (lastDot > lastComma && lastComma === -1) {
      cleaned = cleaned.replace(/(\.\d{3})(?=\d)/g, "$1").replace(/\.(?=\d{3}(\D|$))/g, "");
    }
    return parseFloat(cleaned);
  }

  // Formatea un número para mostrarlo DENTRO de un input de texto en
  // formato español, sin símbolo de moneda (para eso está money()).
  function formatEsInput(n) {
    if (!Number.isFinite(n)) return "";
    var hasDecimals = Math.round(n * 100) % 100 !== 0;
    var fixed = n.toFixed(hasDecimals ? 2 : 0);
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",");
  }

  return { money: money, pct: pct, num: num, parseEs: parseEs, formatEsInput: formatEsInput };
})();
