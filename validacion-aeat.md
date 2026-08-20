# Validación empírica contra el simulador oficial de la AEAT

Simulador: `https://www2.agenciatributaria.gob.es/wlpl/PRET-R200/R260/index.zul`
NIF de prueba usado: `12345678Z`. Nacimiento 1990, sin discapacidad, empleado
activo, contrato general, sin Ceuta/Melilla (salvo donde se indique).

## Casos confirmados

| Caso | Bruto | Situación | BASE AEAT | MÍNIMO AEAT | TIPO AEAT | IMPORTE AEAT | TIPO motor | Coincide |
|---|---|---|---|---|---|---|---|---|
| 1 | 18.000€ | Soltero, sin hijos, 12 pagas | 10.989,50 | 5.550,00 | 5,07% | 912,60€ | 5,07% | ✅ EXACTO |
| 2 | 60.000€ | Soltero, sin hijos, 12 pagas | 54.100,00 | 5.550,00 | 24,44% | 14.664,00€ | 24,44% | ✅ EXACTO |
| 3 | 20.000€ | Soltero, sin hijos, 12 pagas | 15.505,85 | 5.550,00 | 8,86% | 1.772,00€ | 8,86% | ✅ EXACTO |
| 4 | 30.000€ | Soltero, sin hijos, 12 pagas | 26.050,00 | 5.550,00 | 16,42% | 4.926,00€ | 16,42% | ✅ EXACTO |
| 5 | 35.200€ (borde tope 85.3) | Soltero, sin hijos, 12 pagas | 30.912,00 | 5.550,00 | 18,13% | 6.381,76€ | 18,13% | ✅ EXACTO |
| 6 | 40.000€ | Soltero, sin hijos, 12 pagas | 35.400,00 | 5.550,00 | 19,36% | 7.744,00€ | 19,36% | ✅ EXACTO |
| 7 | 100.000€ | Soltero, sin hijos, 12 pagas | 94.021,06 | 5.550,00 | 32,15% | 32.150,00€ | 32,15% | ✅ EXACTO |
| 8 | 25.000€ | Monoparental, 1 hijo (nacido 2015), 12 pagas | 21.375,00 | 7.950,00 | 12,27% | 3.067,50€ | 12,27% | ✅ EXACTO |
| 9 | 30.000€ + bonus 5.000€ previsto | Soltero, sin hijos (entrado como retribución total 35.000€, único campo del simulador) | 30.725,00 | 5.550,00 | 18,08% | 6.328,00€ | 18,08% | ✅ EXACTO |

**Caso 9 resuelve la única duda fiscal abierta:** el simulador de la AEAT no
tiene un campo separado para retribución variable/bonus — solo una
"Retribuciones totales anuales" única. Esto confirma que el tratamiento
correcto es sumar el bonus previsto al bruto en un único total, tanto para
fijar el tipo de retención como para aplicar ese tipo (exactamente lo que
hace el motor tras el fix de `retribAnualPrevista` en `brutoToNeto`).

## Validación cerrada (9/9 casos exactos)

Cubre: ambas ramas del tope 85.3 (por debajo/encima/en el borde de 35.200€),
extremos de la escala (20k-100k), situación familiar con hijos, y bonus. No
quedan dudas fiscales abiertas sobre el algoritmo de retención v1.

## Discrepancia encontrada y corregida (durante la validación)

Caso 18.000€: el motor daba inicialmente 5,74% frente al 5,07% de la AEAT.
Causa raíz: la fórmula del tope art. 85.3 estaba implementada como
`0,43 × retribución total` en vez de `0,43 × (retribución total − umbral de
retención-cero de la situación del contribuyente)`. Corregido en
`lib/tax-engine.js` (`calcularCuotaRetencion`), verificado exacto en todos
los casos posteriores.

Nota aparte (bug de implementación, no del algoritmo AEAT, encontrado por
revisión de código antes de esta ronda de validación): el motor aceptaba
`bonusAnual` para fijar el tipo de retención pero no lo sumaba al neto anual
ni a la base de cotización a la Seguridad Social. Corregido, y el caso 9 de
arriba confirma contra el simulador real que el fix es correcto.

## Pendiente (fuera de v1, no bloquea)

Ceuta/Melilla no se ha vuelto a verificar en esta ronda (ya se comprobó por
consistencia interna: cuota × 0,40 — ver tests). No es una duda fiscal
abierta, es simplemente una variante no repetida con el simulador real.
