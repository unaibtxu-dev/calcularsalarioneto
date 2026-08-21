# Retenciones de nómina — Navarra 2026 (investigación)

**Estado: investigación no realizada.** El intento de investigación se
detuvo antes de ejecutar ninguna búsqueda o consulta web (la llamada al
agente de investigación fue rechazada por el usuario antes de correr, y a
continuación se pidió detener toda navegación). Por tanto, ningún dato de
este documento proviene de una fuente verificada: no hay nada que citar
todavía y no se ha confirmado ni descartado ninguna regla.

Este archivo queda como placeholder para no perder el objetivo, y para que
la próxima sesión de investigación (si se autoriza navegar) sepa exactamente
qué falta.

## 1. Fuentes oficiales encontradas

Ninguna. No se ha consultado hacienda.navarra.es, navarra.es, el BON ni
ninguna norma foral.

## 2. Reglas confirmadas

Ninguna. El motor actual (`lib/tax-engine.js`) sigue bloqueando
explícitamente `territorio: "pais_vasco"` y `"navarra"` con
`bloqueado: true` — eso no ha cambiado y sigue siendo correcto mientras no
haya reglas confirmadas.

## 3. Datos que faltan (todo)

- Norma que regula el reglamento de retenciones sobre rendimientos del
  trabajo en Navarra (decreto/ley foral vigente en 2026).
- Escala/tabla de tipos de retención 2026.
- Mínimo personal y familiar aplicable a la retención.
- Reglas por descendientes, ascendientes y discapacidad.
- Categorías de situación familiar navarras (pueden no coincidir con las
  del régimen común).
- Reglas de redondeo/truncamiento del tipo.
- Suelos, techos y umbral de retención cero, si existen.
- Casos especiales (contrato inferior a un año, relaciones laborales
  especiales, pensionistas, desempleados, etc.).
- Existencia o no de un simulador oficial de retenciones 2026 de Hacienda
  Foral de Navarra.
- Inputs exactos que necesitaría el futuro motor.
- Casos de prueba con resultado oficial (0 de 8 conseguidos).

## 4. Bloqueos

- No se ha autorizado navegar ni investigar. Este es el único bloqueo real:
  sin consultar fuentes oficiales (hacienda.navarra.es, navarra.es, BON) no
  se puede avanzar nada de lo anterior sin inventar datos fiscales, algo
  expresamente prohibido.
- Próximo paso, cuando se autorice: repetir esta investigación con
  WebSearch/WebFetch restringido a dominios oficiales, documentando cada
  regla con su URL exacta antes de tocar código.
