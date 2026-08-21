"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const TaxEngineNavarra = require("../lib/tax-engine-navarra.js");
const C = require("../lib/constants-navarra-2026.js");

function tipoBase(rendimiento, numDescendientes) {
  return TaxEngineNavarra.obtenerTipoBase(rendimiento, numDescendientes, C.tablaRetencion);
}

function tipoFinal(rendimiento, numDescendientes, discapacidad) {
  return TaxEngineNavarra.calcularTipoRetencion(
    { retribucionFija: rendimiento, retribucionVariablePrevisible: 0, numDescendientes: numDescendientes, discapacidad: discapacidad },
    C
  ).tipoRetencion;
}

describe("validación oficial — calculador Hacienda Foral de Navarra 2026", () => {
  const casos = [
    { r: 17000.01, hijos: 0, discapacidad: "ninguna", esperado: 2.0 },
    { r: 30000, hijos: 0, discapacidad: "ninguna", esperado: 14.6 },
    { r: 30000, hijos: 2, discapacidad: "ninguna", esperado: 12.6 },
    { r: 40000, hijos: 0, discapacidad: "ninguna", esperado: 18.1 },
    { r: 40000, hijos: 3, discapacidad: "ninguna", esperado: 14.7 },
    { r: 40000, hijos: 3, discapacidad: "33-64", esperado: 11.7 },
    { r: 350000.01, hijos: 0, discapacidad: "ninguna", esperado: 43.0 },
    { r: 17000, hijos: 0, discapacidad: "ninguna", esperado: 0.0 },
    { r: 23250, hijos: 0, discapacidad: "ninguna", esperado: 8.5 },
    { r: 23250.01, hijos: 0, discapacidad: "ninguna", esperado: 11.0 },
    { r: 40000, hijos: 0, discapacidad: "65omas", esperado: 3.1 }
  ];
  for (const c of casos) {
    test(`${c.r} € / ${c.hijos} hijos / discapacidad=${c.discapacidad} -> ${c.esperado}% (validado en el calculador oficial)`, () => {
      assert.equal(tipoFinal(c.r, c.hijos, c.discapacidad), c.esperado);
    });
  }
});

describe("rendimiento -> retribución anual (fijo + variable previsible)", () => {
  test("suma fijo y variable previsible", () => {
    const r = TaxEngineNavarra.calcularTipoRetencion({ retribucionFija: 20000, retribucionVariablePrevisible: 3000, numDescendientes: 0 }, C);
    assert.equal(r.rendimientoAnual, 23000);
  });

  test("variable previsible por defecto 0 si no se indica", () => {
    const r = TaxEngineNavarra.calcularTipoRetencion({ retribucionFija: 20000, numDescendientes: 0 }, C);
    assert.equal(r.rendimientoAnual, 20000);
  });
});

describe("bordes exactos de la tabla — límite inferior EXCLUSIVO (0 hijos)", () => {
  const casos = [
    { r: 17000, esperado: 0 },
    { r: 17000.01, esperado: 2.0 },
    { r: 18500, esperado: 2.0 },
    { r: 18500.01, esperado: 4.0 },
    { r: 19750, esperado: 4.0 },
    { r: 19750.01, esperado: 6.0 },
    { r: 21250, esperado: 6.0 },
    { r: 21250.01, esperado: 8.5 },
    { r: 23250, esperado: 8.5 },
    { r: 23250.01, esperado: 11.0 },
    { r: 35750, esperado: 17.0 },
    { r: 35750.01, esperado: 18.1 },
    { r: 94750, esperado: 30.8 },
    { r: 94750.01, esperado: 32.2 },
    { r: 350000, esperado: 42.0 },
    { r: 350000.01, esperado: 43.0 }
  ];
  for (const c of casos) {
    test(`rendimiento=${c.r} -> tipo base ${c.esperado}%`, () => {
      assert.equal(tipoBase(c.r, 0), c.esperado);
    });
  }
});

describe("bordes combinados con número de descendientes", () => {
  test("17.000,01 con 1 hijo -> 1.0%; con 2 hijos -> 0%", () => {
    assert.equal(tipoBase(17000.01, 1), 1.0);
    assert.equal(tipoBase(17000.01, 2), 0);
  });

  test("18.500,01 con 2 hijos -> 2.0%; con 3 hijos -> 0%", () => {
    assert.equal(tipoBase(18500.01, 2), 2.0);
    assert.equal(tipoBase(18500.01, 3), 0);
  });

  test("23.250 con 3 hijos -> 4.5%; con 4 hijos -> 2.5%; con 5 -> 0%", () => {
    assert.equal(tipoBase(23250, 3), 4.5);
    assert.equal(tipoBase(23250, 4), 2.5);
    assert.equal(tipoBase(23250, 5), 0);
  });

  test("23.250,01 con 3 hijos -> 7.0%; con 10+ hijos -> 0%", () => {
    assert.equal(tipoBase(23250.01, 3), 7.0);
    assert.equal(tipoBase(23250.01, 10), 0);
  });

  test("35.750 con 10+ hijos -> 2.0%; 35.750,01 con 10+ -> 6.1%", () => {
    assert.equal(tipoBase(35750, 10), 2.0);
    assert.equal(tipoBase(35750.01, 10), 6.1);
  });

  test("94.750 con 3 hijos -> 29.4%; 94.750,01 con 3 hijos -> 30.8%", () => {
    assert.equal(tipoBase(94750, 3), 29.4);
    assert.equal(tipoBase(94750.01, 3), 30.8);
  });

  test("94.750 con 10+ hijos -> 23.9%; 94.750,01 con 10+ -> 25.7%", () => {
    assert.equal(tipoBase(94750, 10), 23.9);
    assert.equal(tipoBase(94750.01, 10), 25.7);
  });

  test("350.000 con 10+ hijos -> 34.5%; 350.000,01 con 10+ -> 36.0%", () => {
    assert.equal(tipoBase(350000, 10), 34.5);
    assert.equal(tipoBase(350000.01, 10), 36.0);
  });

  test("más de 10 descendientes se acota a la columna 10+", () => {
    assert.equal(tipoBase(350000.01, 15), tipoBase(350000.01, 10));
  });
});

describe("minoración por discapacidad del perceptor", () => {
  test("23.250,01 con discapacidad >=65%: 11.0 - 15 puntos -> nunca negativo, queda en 0", () => {
    assert.equal(tipoFinal(23250.01, 0, "65omas"), 0);
  });

  test("17.000,01 con discapacidad >=65%: 2.0 - 15 puntos -> 0 (nunca negativo)", () => {
    assert.equal(tipoFinal(17000.01, 0, "65omas"), 0);
  });

  test("94.750 con discapacidad 33-64% y 3 hijos: 29.4 - 2 puntos = 27.4", () => {
    assert.equal(tipoFinal(94750, 3, "33-64"), 27.4);
  });

  test("94.750,01 con discapacidad 33-64% y 3 hijos: 30.8 - 2 puntos = 28.8 (banda >94.750)", () => {
    assert.equal(tipoFinal(94750.01, 3, "33-64"), 28.8);
  });

  test("41.250,01 con discapacidad 33-64%: banda (41.250, 94.750] resta 2 puntos: 20.0 - 2 = 18.0", () => {
    assert.equal(tipoBase(41250.01, 0), 20.0);
    assert.equal(tipoFinal(41250.01, 0, "33-64"), 18.0);
  });

  test("41.250 con discapacidad 33-64%: todavía banda (23.250, 41.250], resta 3 puntos: 18.1 - 3 = 15.1", () => {
    assert.equal(tipoBase(41250, 0), 18.1);
    assert.equal(tipoFinal(41250, 0, "33-64"), 15.1);
  });

  test("sin discapacidad ('ninguna' o valor no reconocido) no aplica minoración", () => {
    assert.equal(tipoFinal(50000, 0, "ninguna"), tipoBase(50000, 0));
    assert.equal(tipoFinal(50000, 0, undefined), tipoBase(50000, 0));
  });

  test("el tipo final nunca es negativo en ningún caso de la tabla", () => {
    for (const fila of C.tablaRetencion) {
      for (const disc of ["33-64", "65omas"]) {
        for (let hijos = 0; hijos <= 10; hijos++) {
          const t = tipoFinal(fila.thresholdExclusive + 0.01, hijos, disc);
          assert.ok(t >= 0, `rendimiento=${fila.thresholdExclusive + 0.01} hijos=${hijos} disc=${disc}`);
        }
      }
    }
  });
});

describe("casos límite de entrada", () => {
  test("rendimiento 0 o por debajo del primer umbral -> tipo 0", () => {
    assert.equal(tipoBase(0, 0), 0);
    assert.equal(tipoBase(16999.99, 5), 0);
  });

  test("retribución negativa se normaliza a 0", () => {
    const r = TaxEngineNavarra.calcularTipoRetencion({ retribucionFija: -5000, numDescendientes: 0 }, C);
    assert.equal(r.rendimientoAnual, 0);
    assert.equal(r.tipoRetencion, 0);
  });

  test("descendientes negativos se normalizan a 0", () => {
    const r = TaxEngineNavarra.calcularTipoRetencion({ retribucionFija: 30250.01, numDescendientes: -3 }, C);
    assert.equal(r.numDescendientes, 0);
  });

  test("buscarFilaTabla devuelve null por debajo del primer umbral", () => {
    assert.equal(TaxEngineNavarra.buscarFilaTabla(17000, C.tablaRetencion), null);
    assert.notEqual(TaxEngineNavarra.buscarFilaTabla(17000.01, C.tablaRetencion), null);
  });
});

describe("esquema de la tabla de constantes", () => {
  test("cada fila tiene exactamente 11 columnas (0..10+)", () => {
    for (const fila of C.tablaRetencion) {
      assert.equal(fila.tipos.length, 11, "thresholdExclusive=" + fila.thresholdExclusive);
    }
  });

  test("los umbrales están en orden estrictamente ascendente", () => {
    for (let i = 1; i < C.tablaRetencion.length; i++) {
      assert.ok(C.tablaRetencion[i].thresholdExclusive > C.tablaRetencion[i - 1].thresholdExclusive);
    }
  });

  test("las 4 bandas de minoración por discapacidad cubren sin huecos desde 17.000 hasta infinito", () => {
    const bandas = C.minoracionDiscapacidad;
    assert.equal(bandas[0].desdeExclusive, 17000);
    for (let i = 1; i < bandas.length; i++) {
      assert.equal(bandas[i].desdeExclusive, bandas[i - 1].hastaInclusive);
    }
    assert.equal(bandas[bandas.length - 1].hastaInclusive, Infinity);
  });
});
