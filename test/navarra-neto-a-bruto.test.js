"use strict";
/**
 * Integración Navarra 2026 en Neto->Bruto: App.brutoToNetoNavarra /
 * App.netoToBrutoNavarra viven en assets/js/components.js (compartidas con
 * Bruto->Neto, sin duplicar la combinación SS+retención). Se cargan aquí
 * vía vm sobre el código real del navegador, en vez de reimplementar la
 * lógica en el test, para probar exactamente lo que se sirve.
 */
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const TaxEngine = require("../lib/tax-engine.js");
const Constants2026 = require("../lib/constants-2026.js");
const TaxEngineNavarra = require("../lib/tax-engine-navarra.js");
const ConstantsNavarra2026 = require("../lib/constants-navarra-2026.js");

const sandbox = { TaxEngine, Constants2026, TaxEngineNavarra, ConstantsNavarra2026, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../assets/js/format.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../assets/js/components.js"), "utf8"), sandbox);
const App = sandbox.App;

function roundtrip(netoPorPagaObjetivo, numPagas, numHijos, discapacidadPropia) {
  const datos = { numPagas, numHijos, discapacidadPropia, tipoContrato: "general" };
  const netoAnualObjetivo = netoPorPagaObjetivo * numPagas;
  const inverso = App.netoToBrutoNavarra(Object.assign({}, datos, { netoAnualObjetivo }));
  const directo = App.brutoToNetoNavarra(Object.assign({}, datos, { salario: inverso.brutoAnual }));
  return { inverso, directo, netoAnualObjetivo };
}

describe("Navarra 2026 — Neto->Bruto: round-trip para objetivos netos por paga", () => {
  const casos = [
    { netoPorPaga: 1200, numPagas: 12, numHijos: 0, discapacidad: "ninguna" },
    { netoPorPaga: 1500, numPagas: 12, numHijos: 0, discapacidad: "ninguna" },
    { netoPorPaga: 2000, numPagas: 12, numHijos: 0, discapacidad: "ninguna" },
    { netoPorPaga: 2500, numPagas: 12, numHijos: 2, discapacidad: "ninguna" }, // con hijos
    { netoPorPaga: 3000, numPagas: 12, numHijos: 0, discapacidad: "65omas" }, // con discapacidad
    { netoPorPaga: 1200, numPagas: 14, numHijos: 0, discapacidad: "ninguna" }, // 14 pagas
    { netoPorPaga: 2000, numPagas: 14, numHijos: 3, discapacidad: "ninguna" } // 14 pagas + hijos
  ];

  for (const c of casos) {
    test(`${c.netoPorPaga} €/paga x ${c.numPagas} pagas, ${c.numHijos} hijos, discapacidad=${c.discapacidad}`, () => {
      const { inverso, directo, netoAnualObjetivo } = roundtrip(c.netoPorPaga, c.numPagas, c.numHijos, c.discapacidad);
      assert.equal(inverso.bloqueado, false);
      assert.ok(inverso.objetivoAlcanzado, "objetivo no alcanzado");
      assert.ok(Math.abs(directo.netoAnual - netoAnualObjetivo) <= 0.0100001, "round-trip fuera de tolerancia (1 céntimo)");
    });
  }
});

describe("Navarra 2026 — Neto->Bruto: comportamiento territorial", () => {
  test("régimen común (TaxEngine.netoToBruto) no se ve afectado por la integración Navarra", () => {
    const r = TaxEngine.netoToBruto({ netoAnualObjetivo: 24000, numPagas: 12, situacionFamiliar: "otro", numHijos: 0 }, Constants2026);
    assert.equal(r.bloqueado, false);
    assert.ok(r.objetivoAlcanzado);
  });

  test("País Vasco sigue bloqueado en netoToBruto común (sin ruta Navarra)", () => {
    const r = TaxEngine.netoToBruto({ netoAnualObjetivo: 24000, numPagas: 12, territorio: "pais_vasco" }, Constants2026);
    assert.equal(r.bloqueado, true);
  });

  test("formato español: netoToBrutoNavarra acepta el mismo objetivo calculado desde un salario con coma/puntos", () => {
    const Fmt = sandbox.Fmt;
    const netoPorPaga = Fmt.parseEs("2.500,00");
    assert.equal(netoPorPaga, 2500);
    const r = App.netoToBrutoNavarra({ netoAnualObjetivo: netoPorPaga * 12, numPagas: 12, numHijos: 0, discapacidadPropia: "ninguna", tipoContrato: "general" });
    assert.equal(r.bloqueado, false);
    assert.ok(r.objetivoAlcanzado);
  });
});
