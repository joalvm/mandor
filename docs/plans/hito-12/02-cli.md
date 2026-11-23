# Plan 02 — `mandor` corre colecciones de Request en terminal y CI

> Escrito el 2026-11-22, antes de cerrar H11. Al abrir H12, re-anclar rutas y contratos: el plan 06
> de H11 rehace scripts (API `mandor.`, editor) y esto mueve justo esa cadena.

## Contexto

- Enviar un request vive en main de Request: `apps/sync/src/main/request/` (`run-send.ts`,
  `send-chain.ts`, `dispatch-item.ts`, `resolve-request.ts`, scripts antes y después,
  `apply-script-effects.ts`). Pide a `@mandor/host` los tipos de red, TLS y entorno (`NetworkFor`,
  `DialTls`, `EnvironmentPlace`) y usa `transport-sync`, `script`, `vars`, `graphql`, `validate`.
- Cadena de scripts vive en `host`: `packages/host/src/script/` (`run-chain.ts`, `run-on-worker.ts`
  sobre `node:worker_threads`, `serve-scripts.ts`, único archivo fuera de `script` que carga el
  motor, y `approved-scripts.ts`, aprobaciones en `userData`). Cada app arranca su worker con
  `@mandor/host/script-worker`.
- Orígenes: `packages/host/src/origin/origins.ts`, `origins.json` en el `userData` de cada app.
- Tests ya existen dentro de los scripts (`test`, `expect`), de a un request. No hay corrida de
  colección: `pendiente.md` §5, «Runner de colección».
- Nada de eso corre sin Electron: vive en main, pegado a `host` (plataforma). `pendiente.md` §6 pide
  la CLI cuando exista el runner.

Dolor: CI no corre una colección de Mandor, y nadie corre una colección en orden, ni en la app.
Postman tiene su CLI (con cuenta), Bruno `bru run`, Insomnia `inso`.

Ganancia: `npx @mandor/cli run <dirección>` en terminal y CI, contra el repo que el usuario ya
sincroniza, con el mismo motor que la app, reporte JUnit y código de salida.

## Decisiones base

- **Un binario `mandor`, paquete npm `@mandor/cli`, app `apps/cli`.** Este plan: `run` y `ls`.
  `mcp`, `import` y `skill` son del plan 03. `mandor` y `mandor-cli` ya son de otro en npm;
  `@mandor/cli` libre (404 el 2026-11-22). Puerta externa: org `mandor` en npm a nombre del dueño.
  Si está tomada, preguntar otro nombre antes de la fase 5.
- **Núcleo de ejecución sale de main a `packages/runner`, puro.** Cadena de scripts desde `host`,
  envío desde main de Request. Lo que solo el escritorio sabe entra por parámetro: secretos
  (`safeStorage`), aprobaciones, cookies, red y TLS del sistema, desborde a disco de cuerpos
  grandes, logger, avisos a la ventana. La app se porta igual: mismos tests, movidos.
- **Transporte entra por parámetro.** `runner` no importa `transport-sync`: solo una app elige
  transporte (`no-app-type-choice-outside-apps`). Main de Request y la CLI se lo pasan.
- **Worker de scripts se muda**: `@mandor/host/script-worker` → `@mandor/runner/script-worker`, con
  su doble en proceso (`testing/script-worker`). `engine-loads-only-in-the-worker` e
  `in-process-worker-only-in-tests` guardan nombre y motivo; cambian sus rutas.
- **Corrida de colección**: orden del árbol, el del lateral; variables que fija un script pasan al
  siguiente request de la corrida; cookies en memoria, nuevas por corrida; `--bail` corta al primer
  fallo; Ctrl+C cancela el request en vuelo y reporta lo corrido. Sin `setNextRequest`, datasets ni
  iteraciones (`pendiente.md` §6).
- **Resultado tipado** (zod) en `runner`: por request, nombre, camino de nombres, estado, duración,
  tests (nombre, pasó, mensaje) y error. Reportes en la CLI: terminal (colores con `styleText`, que
  se apagan sin TTY o con `NO_COLOR`), JSON y JUnit. Salida: 0 verde, 1 algún test o request falló,
  2 uso mal escrito, 130 Ctrl+C.
- **Secretos en la CLI**: valor solo de `--var nombre=valor` o de la variable de entorno
  `MANDOR_VAR_<NOMBRE>` (mayúsculas; lo que no es letra ni dígito pasa a `_`; dos nombres que caen
  en la misma salen 2 con ambos). Nunca del disco: `safeStorage` es del escritorio y la CLI no lo
  lee. Nunca impreso: todo reporte redacta los valores secretos. Sin valor, `{{nombre}}` queda
  literal y el request sale igual.
- **Entorno**: `--env <nombre>` elige un entorno del workspace (valores no secretos del disco);
  `--var` pisa cualquier variable.
- **Scripts corren**: escribir `mandor run` es el consentimiento, como `bru run`. Mismo QuickJS en
  worker, mismos límites. `--no-scripts` los salta. Sin aprobaciones: son del escritorio.
- **Repos**: por defecto, los orígenes de la máquina (`origins.json` de cada app; ruta calculada sin
  Electron: carpeta de datos del sistema + nombre visible de la app, como la arma Electron). En CI,
  `--repo <carpeta>`, repetible, apunta al checkout del repo sincronizado. Leer y escribir
  `origins.json` baja de `host` a `store-fs` (entidad `origin/`); `host` lo llama con su `userData`.
- **Direcciones por nombre**: `mandor run "<workspace>/<colección>[/<carpeta>…][/<request>]"`, o
  `--id`. Nombre ambiguo: salida 2 con los candidatos. `mandor ls [dirección]` lista el árbol con
  nombres e ids; `--json` para máquinas.
- **Realtime**: `ls` lee sus repos; `run` todavía no, ejecutar un socket espera escenarios
  (`pendiente.md` §5). Diferencia anotada en la tabla de `mandor.md`.
- **Textos de la CLI en inglés**, como `git` y `npm`. `@mandor/i18n` es de ventana.
- **Build**: Vite en modo SSR → `dist/mandor.mjs` con `#!/usr/bin/env node`, el worker de scripts y
  el wasm de QuickJS al lado. Todo `@mandor/*` y las librerías van dentro: `dependencies` del paquete
  publicado vacío o casi. `engines.node` ≥22.19 (lo pide `undici` 8): las LTS de los CI ajenos, no
  la 26 del repo.

## No entra aquí

- MCP, `import` y skill: plan 03.
- Runner de colección dentro de la app: cuando alguien lo pida. El núcleo queda listo en `runner`.
- Ejecutar Realtime: escenarios, `pendiente.md` §5.
- `setNextRequest`, datasets, iteraciones: `pendiente.md` §6.
- `mandor docs build`: cuando alguien lo pida (plan 01).
- Leer `safeStorage` desde la CLI: nunca.

## Librerías antes que código

| Pieza      | Candidata                                                     | Decisión                                                                                                                                                              |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Argumentos | `node:util` `parseArgs`; commander, yargs                     | Nativo. Subcomandos y flags caben; sin dependencia                                                                                                                    |
| Colores    | `node:util` `styleText`; chalk, picocolors                    | Nativo; respeta `NO_COLOR` y TTY                                                                                                                                      |
| JUnit      | `junit-report-builder` 5.1.2 (MIT, 2026-04-14)                | No entra: arrastra `lodash`, `make-dir` y `xmlbuilder` para unas 40 líneas de XML. A mano, con escape probado contra nombres hostiles (`<`, `&`, comillas, controles) |
| Bundle     | Vite 8.3.8 en modo SSR                                        | Se reusa: ya construye las apps                                                                                                                                       |
| HTTP       | `undici` 8.12.4 vía `transport-sync`                          | Se reusa                                                                                                                                                              |
| Scripts    | `quickjs-emscripten-core` 0.32.0 vía `script`                 | Se reusa                                                                                                                                                              |
| Publicar   | `npm publish --provenance` con publicador de confianza (OIDC) | Sin token guardado                                                                                                                                                    |

## Las dos apps

| Pieza                | Dónde vive | Quién la usa                        |
| -------------------- | ---------- | ----------------------------------- |
| Cadena de scripts    | `runner`   | main de las dos apps, CLI           |
| Envío de un request  | `runner`   | main de Request, CLI                |
| Corrida de colección | `runner`   | CLI; la app cuando la pida          |
| Orígenes             | `store-fs` | `host`, CLI                         |
| `ls`                 | `apps/cli` | repos de las dos apps               |
| `run`                | `apps/cli` | Request; Realtime espera escenarios |

## Criterios de entrada

- `packages/runner`: puro, con consumidores reales hoy, main de las dos apps (scripts) y main de
  Request (envío); la CLI es el tercero. Hace falta porque la CLI no puede cargar `host` (Electron)
  ni una app a otra (`the-two-apps-ignore-each-other`).
- `apps/cli`: raíz nueva, proceso Node sin Electron. Se registra en las herramientas que enumeran
  apps (turbo, depcruise, knip, globs de test, typecheck). El test de manifiestos de apps, pensado
  para Electron, aprende que `dependencies` de la CLI es lo que su bundle carga en ejecución.
- Ninguna librería nueva.

### [ ] Fase 1: Cadena de scripts en `runner`

**Objetivo.** Las dos apps corren scripts desde `runner`; `host` ya no tiene la cadena.

```check
file packages/runner/package.json
exports @mandor/runner runChain
file packages/runner/src/script/run-chain.ts
tested packages/runner/src/script/run-chain.ts
no-file packages/host/src/script/run-chain.ts
contains apps/sync/src/main/script-worker.ts "@mandor/runner/script-worker"
contains apps/async/src/main/script-worker.ts "@mandor/runner/script-worker"
contains .dependency-cruiser.cjs "packages/runner/src/testing/in-process-script-worker"
```

**Cambios.**

- Nace `runner`, puro: `script/` con cadena, worker y protocolo. Subrutas `script-worker` y
  `testing/script-worker`, que `host` pierde.
- Aprobaciones siguen en `host` (`userData`) y entran a la cadena como parámetro «qué scripts pueden
  correr». La CLI pasará «todos».
- Main de las dos apps: su worker apunta a `runner`; los handlers de `host` que corren scripts
  llaman a `runner`.
- Reglas de depcruise con rutas nuevas, mismo nombre y motivo.
- Tests de la cadena se mudan con ella. Cobertura 100 % (paquete puro), o suelo con motivo escrito
  en `vitest.config.ts` si el hilo real del worker no se cubre en node.

**No hacer.** Envío de request. CLI.

**Cierre.** `npm run ci:test -- packages/runner/tests`, luego
`npm run ci:check -- packages/runner packages/host apps/async apps/sync` y `npm run ci:verify`
(paquete nuevo toca herramientas). Con cada app abierta: un script con `test` corre y su resultado se
ve como antes.

### [ ] Fase 2: Envío de un request en `runner`

**Objetivo.** Main de Request envía por `runner`; nada del envío queda pegado a Electron.

```check
exports @mandor/runner sendItem
file packages/runner/src/request/send-item.ts
tested packages/runner/src/request/send-item.ts
no-file apps/sync/src/main/request/resolve-request.ts
no-file apps/sync/src/main/request/send-chain.ts
```

**Cambios.**

- `runner/request/`: resolver variables, scripts antes y después, despacho, efectos de scripts,
  respuesta tipada. Lo de hoy, movido sin cambio de comportamiento.
- Entra por parámetro: transporte, red y TLS (proxy, certificados del sistema), cookies, secretos ya
  resueltos, desborde a disco, logger, avisos de progreso. Los tipos de esos parámetros nacen en
  `runner`; `host` deja de exportar los que solo servían al envío.
- Main de Request arma esos parámetros con lo que ya tiene y llama a `sendItem`.
- Tests del envío se mudan; los de main de Request quedan como contrato del cableado. En `runner`,
  servidor HTTP real local (`node:http`), no dobles de `undici`.

**No hacer.** Colección. CLI.

**Cierre.** `npm run ci:test -- packages/runner/tests apps/sync/tests/unit-node/main`, luego
`npm run ci:check -- packages/runner packages/host apps/sync` y `npm run ci:local` (e2e de Request
con envío real). Con Request abierta: enviar, ver respuesta, tests y cookies como antes.

### [ ] Fase 3: Corrida de colección

**Objetivo.** `runner` corre una colección, carpeta o request en orden y devuelve un resultado
tipado.

```check
exports @mandor/runner runCollection
exports @mandor/runner collectionRunSchema
file packages/runner/src/collection/run-collection.ts
tested packages/runner/src/collection/run-collection.ts
```

**Cambios.**

- Orden del árbol. Variables que fija un script pasan al siguiente. Cookies por corrida. `bail` y
  señal de corte.
- Resultado zod: request a request y totales; nombres, nunca rutas de disco.
- Progreso por evento (empieza, termina) para que la CLI pinte en vivo.
- Tests node contra servidor local: orden, paso de variables, test que falla, error de red, corte a
  mitad, `bail`. Cobertura 100 %.

**No hacer.** Reportes. CLI. Runner en la app.

**Cierre.** `npm run ci:test -- packages/runner/tests/collection`, luego
`npm run ci:check -- packages/runner`.

### [ ] Fase 4: `mandor run` y `mandor ls`

**Objetivo.** Desde terminal o CI, `mandor` lista y corre colecciones de un repo y sale con código y
reporte.

```check
file apps/cli/package.json
contains apps/cli/package.json "@mandor/cli"
file apps/cli/src/run/run-command.ts
tested apps/cli/src/run/run-command.ts
file apps/cli/src/report/junit-report.ts
tested apps/cli/src/report/junit-report.ts
exports @mandor/store-fs listOrigins
no-file packages/host/src/origin/origins.ts
matches .github/workflows /node-version: ['"]?22/
```

**Cambios.**

- `apps/cli`: entrada con `parseArgs`, subcomandos `run` y `ls`, ayuda y errores en inglés.
- Orígenes de las dos apps por la carpeta de datos del sistema, o `--repo`. Lectura y escritura de
  `origins.json` en `store-fs`, movidas desde `host`.
- `run`: dirección o `--id`, `--env`, `--var`, `MANDOR_VAR_*`, `--bail`, `--no-scripts`,
  `--reporter terminal|json|junit` (varios con coma), `--out`. Llama a `runCollection` con
  `transport-sync`, la red de Node y sin aprobaciones.
- `ls`: árbol de workspaces, colecciones, carpetas e items de las dos apps; `--json`.
- Reportes: terminal en vivo con el progreso; JSON = el resultado zod; JUnit a mano, con escape
  probado.
- Redacción: ningún reporte imprime un valor secreto. Centinela en test, por los tres reportes.
- Build SSR: `mandor.mjs`, worker y wasm al lado; `bin` y `files` en el manifiesto.
- Job de CI en Node 22: tests node de `apps/cli` y `runner`, más un humo del binario construido
  contra un servidor local. Solo si el PR toca `apps/cli`, `runner` o lo que importan;
  `timeout-minutes`.
- README (es y en): sección «Correr en terminal y CI», con un ejemplo de GitHub Actions.

**No hacer.** Publicar en npm. MCP.

**Cierre.** `npm run ci:test -- apps/cli/tests packages/store-fs/tests/origin`, luego
`npm run ci:check -- apps/cli packages/store-fs packages/host .github` y `npm run ci:verify`. Con el
build: `ls` lista los orígenes de la máquina; `run` de una colección de ejemplo sale 0 y escribe
JUnit.

### [ ] Fase 5: Publicación en npm

**Objetivo.** Un tag `cli-vX.Y.Z` publica `@mandor/cli` con procedencia, sin token guardado.

```check
file .github/workflows/cli-release.yml
contains .github/workflows/cli-release.yml "id-token: write"
contains .github/workflows/cli-release.yml "--provenance"
contains .github/workflows/cli-release.yml "timeout-minutes"
contains apps/cli/package.json "publishConfig"
```

**Cambios.**

- Workflow en tag: build, tests node de la CLI, `npm publish --provenance --access public` por
  OIDC. Permisos mínimos, `timeout-minutes`.
- Versión de la CLI propia, apartada de la de las apps. Manifiesto publicable: `publishConfig`,
  `repository`, `license`, `files`; README del paquete en inglés.
- Puerta externa, una vez y a mano: org `mandor` en npm y publicador de confianza atado a este repo
  y a este workflow. Si npm todavía pide que el paquete exista antes de atarlo, el dueño sube la
  primera versión a mano.

**No hacer.** MCP. Skill.

**Cierre.** `npm run ci:check -- apps/cli .github`, luego `npm run ci:qa`. Tras el merge y el tag:
`npx @mandor/cli --version` responde en una máquina limpia.

## Deudas

Ninguna todavía.
