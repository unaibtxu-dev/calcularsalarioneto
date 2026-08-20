"use strict";
const TaxEngine = require("../lib/tax-engine.js");
const C = require("../lib/constants-2026.js");

const casos = [18000, 20000, 25000, 30000, 35000, 40000, 50000, 60000, 80000, 100000];
for (const bruto of casos) {
  const r = TaxEngine.brutoToNeto({ brutoAnual: bruto, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, C);
  console.log(
    bruto,
    "-> tipo:", r.irpf.tipoRetencion + "%",
    " SS:", r.segSocial.anual,
    " neto anual:", r.netoAnual,
    " neto/paga:", r.netoPorPaga
  );
}
