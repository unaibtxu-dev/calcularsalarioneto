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

  return { money: money, pct: pct, num: num };
})();
