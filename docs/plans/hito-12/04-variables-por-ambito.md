# Plan 04 — Un script lee y escribe las variables de cada ámbito por su nombre

> Escrito el 2026-11-23, al cerrar H11, a pedido del usuario. Al empezarlo, re-anclar rutas y
> contratos contra el código.

## Contexto

- Un script ve un solo ámbito: `mandor.variables`
  (`packages/script/src/engine/guest/variables-guest.ts`). `get` resuelve en el orden del lugar y
  `set` deja una variable de script en la ventana, por workspace y entorno
  (`packages/env/src/lib/script-variables.ts`, `EnvSlice['scriptVariables']`): se olvida al cerrar
  Mandor y nunca llega al entorno.
- No hay forma de leer la variable de un entorno que no es el activo, de escribir la de una carpeta
  o una colección, ni de saber de qué ámbito vino un valor. Postman lo da con `pm.environment`,
  `pm.collectionVariables` y `pm.globals`; Bruno separa `bru.getEnvVar` de `bru.getVar`.
- La bombilla traduce `pm.environment.get` y compañía a `mandor.variables.get`
  (`packages/script/src/dialects/postman-dialect.ts`): el ámbito se pierde y `unset` queda sin
  traducción.
- El completado ya conoce cada variable con su origen (`ScriptContext.variables[].origin`,
  `packages/env/src/lib/listed-variables.ts`): sabe nombrar ámbitos.

## Decisiones base

- **`mandor.variables` sigue siendo la vista resuelta.** Lo que el envío usa, en el orden de
  siempre. Nada de lo que hoy funciona cambia de sentido.
- **Un objeto por ámbito, todos con la misma forma.** `mandor.environment`, `mandor.collection`,
  `mandor.folder` y `mandor.globals`, cada uno con `.variables.get|set|has|unset`. `unset` existe
  aquí porque el ámbito es dueño de la variable.
- **Otros ámbitos, por nombre.** `mandor.environments.get(nombre)`, `mandor.collections.get(nombre)`
  y `mandor.folders.get(nombre)` dan el mismo objeto de ámbito. El completado ofrece los nombres
  que existen, como hoy dentro de `variables.get("`. Un nombre que no existe da `undefined`; no
  lanza.
- **Lo que un script escribe es local.** Como el valor actual de Postman: vive en esta máquina, no
  se sincroniza y no toca el archivo del origen. La ventana lo muestra como valor de script sobre el
  guardado. Motivo: un script corre en cada envío, y escribir el origen en cada envío abriría
  conflictos en otra máquina.
- **Un secreto escrito por un script va a `safeStorage`.** Leerlo sigue dando `undefined`. Nunca
  llega al remoto.
- **La estructura se lee, no se escribe.** Nombre de carpeta, docs, auth y headers guardados son
  de solo lectura desde un script. Editarlos es de la CLI y el MCP (planes 02 y 03), donde alguien
  lo pide una vez, no en cada envío.
- **La bombilla conserva el ámbito.** `pm.environment.*` → `mandor.environment.variables.*`,
  `pm.collectionVariables.*` → `mandor.collection.variables.*`, `pm.globals.*` →
  `mandor.globals.variables.*`, con `unset`; `bru.getEnvVar` → `mandor.environment.variables.get`.

## No entra aquí

- Escribir estructura desde un script: ver la decisión. La CLI y el MCP la editan.
- Variables de script guardadas en el origen: `pendiente.md` §6, «Scripts, fuera de v1».
- Una consola que evalúa `mandor.` a mano: sin plan; esta API es la que usaría.

## Librerías antes que código

| Pieza                 | Candidata                                        | Decisión                                                      |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Objetos de ámbito     | Guests de QuickJS que ya existen (`*-guest.ts`)  | Uno más, con la forma de `variables-guest.ts`                 |
| Secretos por script   | `safeStorage` de Electron, el que ya guarda todo | Se usa tal cual; nada nuevo                                   |
| Nombres en completado | `script-completions.ts` de `collections`         | Se amplía con los nombres de entornos, colecciones y carpetas |

El plan no añade dependencias.

## Las dos apps

| Pieza                          | Dónde vive             | Quién la usa                                                                        |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| API de ámbitos y sus tipos     | `script`               | las dos                                                                             |
| Lo escrito por ámbito, local   | `env`                  | las dos                                                                             |
| `mandor.environment`           | `env`                  | Request: entorno del workspace; Realtime: entorno de la conexión                    |
| `mandor.collection`, `.folder` | `collections`          | Request: los del request; Realtime: los del evento enviado, `undefined` al conectar |
| Tablas de la bombilla          | `script/src/dialects/` | las dos                                                                             |

## Criterios de entrada

Todo nace con dos consumidores: las dos apps corren scripts y los dos lados de la tabla de
diferencias tienen entorno, colección y carpeta.

### [ ] Fase 1: El motor da un objeto por ámbito

**Objetivo.** Un script lee y escribe `mandor.environment`, `.collection`, `.folder` y `.globals`,
y sus efectos dicen a qué ámbito van.

```check
file packages/script/src/engine/guest/scopes-guest.ts
tested packages/script/src/engine/guest/scopes-guest.ts
contains packages/script/src/api/script-api.ts "environment.variables.unset"
```

**Cambios.**

- `scopes-guest.ts`: los cuatro objetos sobre los valores que el lugar entrega por ámbito.
- `contract/event-effects.ts`: el efecto de escribir lleva su ámbito.
- `script-api.ts` y `script-types-of.ts`: nombres, ayuda (es, en) y tipos por momento.

**No hacer.** Nada de nombres de otros ámbitos todavía: fase 3.

**Cierre.** `npm run ci:test -- packages/script`.

### [ ] Fase 2: Las dos apps guardan lo escrito por ámbito, en local

**Objetivo.** Lo que un script escribe en un ámbito queda en esta máquina y se ve como valor de
script en ese ámbito, en las dos apps.

```check
contains packages/env/src/lib/script-variables.ts "scope"
```

**Cambios.**

- `env`: lo de script se guarda por ámbito; un secreto, en `safeStorage`.
- Request (`apps/sync/src/main/request/apply-script-effects.ts`) y Realtime aplican el efecto por
  ámbito.

**Cierre.** `npm run ci:test -- packages/env apps/sync apps/async`; las dos apps abiertas: un
script escribe en la colección, la tabla de la colección lo muestra, el archivo del origen no
cambia.

### [ ] Fase 3: Otros ámbitos por su nombre, con completado

**Objetivo.** `mandor.environments.get("staging").variables.get("token")` funciona y el editor
ofrece los nombres que existen.

```check
contains packages/script/src/api/script-api.ts "environments.get"
contains packages/collections/src/lib/script-completions.ts "environments"
```

**Cierre.** `npm run ci:test -- packages/script packages/collections`; ver los nombres en el
completado de las dos apps.

### [ ] Fase 4: La bombilla conserva el ámbito

**Objetivo.** Lo de Postman, Insomnia y Bruno se convierte a su ámbito, `unset` incluido.

```check
contains packages/script/src/dialects/postman-dialect.ts "mandor.environment.variables"
contains SCRIPTS.md "mandor.collection.variables"
```

**Cierre.** `npm run ci:test -- packages/script`; `npm run ci:local`.

## Deudas

Ninguna todavía.
