# Plan 03 — Un agente registra y prueba requests por MCP, con una skill que le enseña

> Escrito el 2026-11-22, antes de cerrar H11. Pide el plan 02 hecho (`runner`, `apps/cli`, CLI
> publicada). Al abrir, re-anclar rutas y contratos contra el código.

## Contexto

- `pendiente.md` §6 dejó decidido el MCP: proceso Node sin Electron, stdio, multi repo, capacidades
  apagadas por defecto (`--allow-execute`, `--allow-secrets-env`, `--commit`), tool oculta sin su
  flag, envío solo al destino de un item que existe, `expectedHash` para no pisar a la app abierta,
  nunca push, nunca devuelve un secreto, nunca ejecuta scripts. Paquete `mcp` más `apps/mcp`.
- Este plan corrige dos puntos de §6:
    - Ni paquete `mcp` ni `apps/mcp`: el servidor es `mandor mcp`, de `apps/cli` (plan 02). Lo que
      comparte con el escritorio ya es puro (`runner`, `store-fs`, `interop-*`); un paquete `mcp`
      tendría un consumidor y nada que repartir.
    - Scripts: «nunca» pasa a «solo con `--allow-scripts`». Los tests viven en scripts: un agente que
      prueba sin ellos ve estado y body, no si la API cumple. Confirmado por el dueño el
      2026-11-22.
- Import vive en `packages/host/src/import/`: plan, choques, nombres libres y escritura de entradas
  sobre `interop-core` y `store-fs`. Electron solo en el diálogo del sistema
  (`system-open-dialog.ts`) y en los secretos (`safeStorage`). La lectura corre en un worker
  (`@mandor/host/import-worker`).
- Escrituras de items en `store-fs`, sin control de concurrencia: escribe lo que recibe.
- La app vigila el repo del origen abierto (`watchRepo` de `store-fs`): lo que escribe otro proceso
  le llega como cambio externo.

Dolor: un agente que acaba de escribir un endpoint no puede dejarlo registrado en Mandor ni
probarlo; el usuario copia a mano. Postman tiene MCP propio, atado a su nube.

Ganancia: el agente lee el repo, registra requests, importa un spec, envía y lee tests, sin cuenta
ni nube; una skill le enseña a hacerlo bien a la primera.

## Decisiones base

- **`mandor mcp`**: servidor MCP por stdio con `@modelcontextprotocol/sdk`. Sin HTTP remoto. Se
  añade con `claude mcp add mandor -- npx -y @mandor/cli mcp`.
- **Tres familias de tools**:
    - Leer, siempre: workspaces, colecciones, árbol, item, entornos (secreta = nombre y marca, nunca
      valor), docs.
    - Registrar, siempre: crear y editar colección, carpeta y request; importar un archivo a un
      workspace. Toda edición pide el `expectedHash` del item leído: distinto, error «cambió desde que
      lo leíste» y nada se pisa.
    - Ejecutar, con `--allow-execute`: enviar un item que existe y correr una colección (`runner`).
      El destino es el del item: lo que sale a la red quedó escrito antes en el repo, a la vista del
      usuario.
- **Secretos**: sin `--allow-secrets-env`, ejecutar no resuelve secretos (`{{nombre}}` literal). Con
  él, toma `MANDOR_VAR_*` del entorno del proceso, que el usuario pone en la config de su cliente.
  Nunca de `safeStorage`. Nunca en una respuesta: todo lo que vuelve al agente, body incluido, sale
  redactado.
- **Scripts**: apagados; `--allow-scripts` los enciende al ejecutar (mismo QuickJS, mismos límites).
  Sin él, el resultado lista los scripts saltados.
- **`--commit`**: tras registrar, commit local en el repo del origen, con el mismo armador de
  mensajes que usa la app (paquete `git`). Nunca push. `.mandor/` queda fuera, como en la app. Sin
  el flag, el cambio queda en disco y la app lo ve por `watchRepo`.
- **Tool oculta sin su flag**: el listado no la nombra; llamarla igual es herramienta desconocida.
- **Repos**: orígenes de la máquina o `--repo` repetible, como `run`.
- **Realtime**: leer y registrar conexiones y eventos, sí; ejecutar, no (escenarios,
  `pendiente.md` §5).
- **Import sin Electron**: el camino puro (plan, choques, nombres libres, escritura de entradas)
  baja de `host` a `store-fs`, entidad `import/`: es escribir el repo desde un IR. En `host` quedan
  el diálogo, el worker de lectura y los secretos en `safeStorage`, que entran al camino por
  parámetro. Sin `safeStorage` (CLI, MCP), un secreto importado queda con nombre y sin valor, y la
  respuesta lo cuenta.
- **`mandor import <archivo> --workspace <nombre>`**: mismo camino, para el CI que mantiene una
  colección al día desde un spec. El workspace dice la app; la app dice qué formatos valen. La CLI
  lista sus formatos como cada main lista los suyos: `host` no nombra ninguno.
- **Skill `mandor`**: `apps/cli/skill/mandor/SKILL.md`, en inglés (lo que leen los agentes), viaja
  en el paquete npm. Enseña: leer antes de escribir, `expectedHash`, direcciones por nombre, el
  ciclo de probar (registrar → ejecutar → leer tests), qué nunca pedir (secretos) y qué abre cada
  flag. `mandor skill install [--project|--global|--dir <carpeta>]` la copia a
  `.claude/skills/mandor/` del proyecto o del usuario, o a la carpeta de otro agente;
  `npx skills add joalvm/mandor --skill mandor` la toma del repo. Apartada de `skills/`: esas son
  para desarrollar Mandor, no producto.

## No entra aquí

- MCP remoto por HTTP: cuando alguien lo pida; abre autenticación y red.
- Ejecutar Realtime: escenarios, `pendiente.md` §5.
- Aprobaciones de scripts compartidas entre app y CLI: nunca; son consentimientos distintos.
- Leer `safeStorage` desde CLI o MCP: nunca.
- Push desde el MCP: nunca.

## Librerías antes que código

| Pieza        | Candidata                                            | Decisión                                                                                                                  |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| MCP          | `@modelcontextprotocol/sdk` 1.32.2 (MIT, 2026-10-23) | Entra, solo en `apps/cli`. Al abrir, comprobar que toma esquemas zod 4; si no, JSON Schema desde zod con `z.toJSONSchema` |
| Hash         | `node:crypto`                                        | Nativo                                                                                                                    |
| Copiar skill | `node:fs` `cp`                                       | Nativo                                                                                                                    |
| Commit       | `@mandor/git` (`simple-git`)                         | Se reusa, con su guarda de push                                                                                           |

## Las dos apps

| Pieza            | Dónde vive                  | Quién la usa                    |
| ---------------- | --------------------------- | ------------------------------- |
| Import puro      | `store-fs`                  | `host` (las dos apps), CLI, MCP |
| `expectedHash`   | `store-fs`                  | MCP                             |
| Leer y registrar | `apps/cli` sobre `store-fs` | repos de las dos apps           |
| Ejecutar         | `apps/cli` sobre `runner`   | Request; Realtime espera §5     |

## Criterios de entrada

- Ningún paquete nuevo: el servidor vive en `apps/cli`; el import baja a `store-fs`, que ya escribe
  el repo.
- `@modelcontextprotocol/sdk`: solo en `apps/cli`, con regla de depcruise que lo diga en su nombre.

### [ ] Fase 1: Import sin Electron y `mandor import`

**Objetivo.** El import corre igual en la app y en la CLI; `mandor import` escribe un spec en un
workspace.

```check
file packages/store-fs/src/import
exports @mandor/store-fs applyImportPlan
no-file packages/host/src/import/plan-builder.ts
no-file packages/host/src/import/apply-plan.ts
file apps/cli/src/import/import-command.ts
tested apps/cli/src/import/import-command.ts
```

**Cambios.**

- `store-fs/import/`: armar el plan contra el disco y aplicarlo. Secretos entran por parámetro.
- `host` queda con diálogo, worker de lectura, secretos en `safeStorage` y handlers; llama a
  `store-fs`. La app se porta igual: mismos tests de import, movidos.
- CLI: `mandor import <archivo> --workspace <nombre>`, salida con lo creado, lo renombrado por choque
  y los secretos sin valor.

**No hacer.** MCP.

**Cierre.** `npm run ci:test -- packages/store-fs/tests/import apps/cli/tests`, luego
`npm run ci:check -- packages/store-fs packages/host apps/cli` y `npm run ci:local` (e2e de import en
las dos apps).

### [ ] Fase 2: MCP que lee y registra

**Objetivo.** Un agente lista, lee, crea, edita e importa por MCP sin pisar lo que cambió en disco.

```check
contains apps/cli/package.json "@modelcontextprotocol/sdk"
file apps/cli/src/mcp/mcp-server.ts
tested apps/cli/src/mcp/mcp-server.ts
exports @mandor/store-fs contentHashOf
exports @mandor/store-fs ChangedOnDiskError
```

**Cambios.**

- `store-fs`: hash del contenido leído y escritura que compara antes de escribir; error tipado si
  cambió.
- `mandor mcp`: stdio, tools de leer y registrar con esquemas zod y descripciones pensadas para un
  agente (qué devuelve, qué pide, qué error espera). Todo item lleva su hash.
- `--commit` con el armador de mensajes de `git`; nunca push.
- Tests: cliente MCP del SDK contra el servidor en proceso, repo temporal real; carrera de
  `expectedHash` (otro proceso escribe entre leer y editar); ningún valor secreto en ninguna
  respuesta.

**No hacer.** Ejecutar.

**Cierre.** `npm run ci:test -- apps/cli/tests packages/store-fs/tests`, luego
`npm run ci:check -- apps/cli packages/store-fs`. Con Claude Code: añadir el servidor, pedirle que
registre un request y verlo aparecer en Request abierta.

### [ ] Fase 3: MCP que ejecuta, con permisos

**Objetivo.** Con `--allow-execute`, el agente envía un item o corre una colección y lee tests;
cada flag abre solo lo suyo.

```check
file apps/cli/src/mcp/execute-tools.ts
tested apps/cli/src/mcp/execute-tools.ts
matches apps/cli/src /allow-execute/
matches apps/cli/src /allow-secrets-env/
matches apps/cli/src /allow-scripts/
```

**Cambios.**

- Tools de ejecutar sobre `runner`: enviar item, correr colección. Solo items que existen.
- Flags: sin `--allow-execute` no aparecen; `--allow-secrets-env` resuelve `MANDOR_VAR_*`;
  `--allow-scripts` corre scripts, y sin él el resultado lista los saltados.
- Redacción de todo valor secreto conocido en todo lo que vuelve, body de la respuesta incluido.
- Tests: listado con y sin cada flag; centinela de secreto en header, URL y body devuelto por el
  servidor; script que no corre sin su flag.

**No hacer.** Skill.

**Cierre.** `npm run ci:test -- apps/cli/tests/mcp`, luego `npm run ci:check -- apps/cli`. Con
Claude Code: registrar, ejecutar y leer el resultado de un test.

### [ ] Fase 4: Skill y versión con MCP

**Objetivo.** Un agente instala la skill de una vez y la nueva versión de `@mandor/cli` trae MCP,
import y skill.

```check
file apps/cli/skill/mandor/SKILL.md
file apps/cli/src/skill/skill-command.ts
tested apps/cli/src/skill/skill-command.ts
contains README.md "claude mcp add mandor"
```

**Cambios.**

- `SKILL.md` en inglés, corto: cuándo usar cada tool, el ciclo registrar → ejecutar → leer tests,
  `expectedHash`, qué abre cada flag, qué nunca pedir. Formato estándar de skill: frontmatter
  `name` y `description`, cuerpo que cabe en una lectura.
- `mandor skill install` con `--project`, `--global` y `--dir`; dice dónde la dejó.
- `files` del paquete npm incluye la skill.
- README (es y en): «Usar con agentes»: `claude mcp add`, flags, `npx skills add`.
- Versión nueva por el workflow del plan 02.

**No hacer.** MCP remoto.

**Cierre.** `npm run ci:test -- apps/cli/tests/skill`, luego `npm run ci:check -- apps/cli` y
`npm run ci:verify`. Tras el tag: en una máquina limpia, `npx @mandor/cli skill install --project`
y una sesión de agente que la use para registrar y probar un request.

## Deudas

Ninguna todavía.
