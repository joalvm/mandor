# Plan NN — Título en una línea, en presente

<!--
Esta plantilla se copia a `docs/plans/hito-N/NN-nombre-corto.md` y se rellena.
No se edita aquí. Lo que sobre se borra; lo que falte no se inventa.

Una fase sin bloque `check` la rechaza `npm run plans` en cuanto el plan
empieza. Se escribe el bloque **antes** del código: escrito después describe lo
que salió, no lo que se pedía.
-->

## Contexto

Qué hay hoy y por qué no vale. Con rutas de archivo y líneas, no con
adjetivos. Si el diagnóstico sale de una spec, se enlaza la spec y **se dice si
el código la desmiente**: una spec escrita sin abrir el archivo se corrige en
este plan, no se obedece.

## Decisiones base

Las decisiones que las fases dan por tomadas, cada una con su porqué. Una
decisión sin porqué es una preferencia, y la siguiente persona la cambia sin
saber qué rompe.

- **Decisión.** Motivo, en una o dos frases.

## No entra aquí

Lo que alguien va a querer hacer de paso y no toca. Cada cosa con el plan que
sí la hace, para que quede claro que no se pierde: no es un descarte, es una
cita.

## Librerías antes que código

| Pieza | Candidata | Decisión |
| ----- | --------- | -------- |
|       |           |          |

Antes de escribir un módulo se dice qué librería lo cubre. Código propio solo si
la librería no cumple, no existe, o está muerta —y entonces se escribe cuál se
miró y por qué no—. Si el plan no añade dependencias, se dice así de claro.

## Las dos apps

| Pieza | Dónde vive | Quién la usa |
| ----- | ---------- | ------------ |
|       |            |              |

Lo que sirve a Async y a Sync se construye una vez y **las dos apps lo
registran en el mismo PR**. Lo que se queda en una app se queda con su motivo,
y el motivo sale de la tabla de diferencias de
[`mandor.md`](../specs/mandor.md).

## Criterios de entrada

Para cada pieza que aspire a `packages/`: entra si nace con dos consumidores
reales. Si al escribirla resulta que solo la monta una app, se queda en esa app
y sube cuando llegue la segunda. Se escribe aquí, antes, para no discutirlo con
el diff delante.

### [ ] Fase 1: Título corto de lo que entrega

**Objetivo.** Una frase. Qué se puede hacer al terminar que no se podía antes.

```check
file ruta/que/nace.ts
tested ruta/que/nace.ts
contains ruta/que/cambia.tsx "lo que ahora dice"
absent ruta/que/cambia.tsx "lo que ya no dice"
no-file ruta/que/muere.ts
exports @mandor/ui NombreDeLaPrimitiva
matches paquete/o/carpeta /expresión/
no-match paquete/o/carpeta /lo que no debe quedar/
```

Ocho verbos y ninguno ejecuta nada. Literal entre comillas, expresión entre
barras. Reglas de un bloque que sirve:

- **Ninguna línea puede pasar antes de hacer el trabajo.** Un check que ya está
  en verde el día que se escribe no comprueba nada. Se corre a mano antes de
  empezar y tiene que fallar entero.
- `tested` por cada archivo que nace. Un archivo nuevo llega con su test.
- Lo que no se pueda decir con estos ocho verbos **no es un check: es un test**,
  y los tests tienen su sitio.

**Cambios.**

- Lo que se toca, archivo a archivo, con el porqué cuando no sea obvio.

**No hacer.** Lo que está a un paso y pertenece a otra fase o a otro plan.

**Cierre.** El comando que se corre y lo que hay que mirar con la app abierta,
si la fase toca algo que se ve.

### [ ] Fase 2: …

<!-- Tantas como haga falta. Una fase = un commit. -->

## Deudas

Ninguna todavía. Lo que aparezca y no toque la fase en curso se anota aquí, con
la fase que lo encontró. Arreglarla en silencio ensucia el diff y borra el
rastro de que existió; callarla la pierde.
