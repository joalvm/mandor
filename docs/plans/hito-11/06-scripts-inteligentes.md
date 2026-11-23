# Plan 06 — Los scripts se escriben con `mandor.` en su editor, con IntelliSense que conoce el request, y lo importado entra ahí

> Escrito el 2026-11-22, a pedido del usuario (2026-11-21): scripts antes del release. No sale de
> `pendiente.md` §1. Rutas y líneas comprobadas ese día; al empezar, re-anclar las que cite cada
> fase.

## Contexto

Lo que hay:

- **API.** `packages/script/src/api/script-api.ts`. `SCRIPT_API` lista entradas
  `{name, object, signature, docKey}` con nombres cortos y sueltos: `vars.get`, `vars.replaceIn`,
  `response.timeMs`. Cada objeto es un nombre global del script (`ScriptApiObject`: `console`,
  `atob`, `btoa`, `URLSearchParams`, `vars`, `test`, `expect`, `request`, `response`, `message`,
  `socket`, `sendRequest`). Docs en `packages/i18n/src/lang/{es,en}/collections.json`, bloque
  `script.api`, una frase por entrada y ninguna por parámetro.
- **Engine.** `packages/script/src/engine/script-source.ts`: `scriptSourceOf` mete el texto como
  cuerpo de `async function (${params})`, con los objetos de la API de parámetros. Un
  `const response = await …` en Después de la respuesta redeclara el parámetro `response`:
  SyntaxError antes de correr. En Postman no pasa: su API vive bajo `pm`.
- **Editor.** `packages/collections/src/components/scripts/ScriptEditor.tsx` monta
  `CodeEditor language="javascript"` con `suggest` = `scriptSuggestions`
  (`packages/collections/src/lib/script-suggestions.ts`): rutas fijas, paso a paso por punto. Sin
  tipos, firma, hover ni diagnóstico. No conoce variables, headers ni la respuesta.
- **Ventana sin workers.** Monaco calcula diff, unicode y esquemas JSON en el hilo de la ventana
  (`packages/ui/src/editor/monaco/main-thread-diff.ts`, `main-thread-unicode.ts`,
  `schema-service.ts`). Sus comentarios dicen que un worker que pide su script al esquema de la
  ventana (`mandor://app`, `packages/host/src/window/renderer-protocol.ts`) «never starts». Ningún
  test lo prueba. La CSP ya deja `worker-src 'self'` (`content-security-policy.ts`): el comentario
  de `main-thread-diff.ts` que dice que la política no lo permite está desfasado. La fase 4 lo
  comprueba y corrige el comentario.
- **Importado aparte.** Postman e Insomnia guardan sus scripts en `importedScripts`
  (`packages/schema/src/script/imported-script.ts`: `{event, dialect, source}`), en request,
  carpeta, colección y workspace. Request los pinta en un panel propio, de solo lectura, con aviso
  y botón «Pasar al editor» (`apps/sync/src/renderer/features/requests/components/scripts/RequestImportedScripts.tsx`,
  `apps/sync/src/renderer/features/requests/lib/convert-imported-script.ts`). Sobre ese panel, el
  usuario: «debe desaparecer de todo el código y layout, no debe existir».
- **Bruno sin scripts.** `packages/interop-formats/src/bruno/bruno-format.ts`:
  `scriptsIn: 'none'`. `read-bru-collection.ts` los manda a `leftOut`. `pendiente.md` §6 y
  `mandor.md` §Scripts los dejan fuera de v1.
- **Export.** Postman exporta solo los importados de su dialecto
  (`postman/export/script-events.ts`). Los scripts propios no salen en ningún formato:
  `scriptsLossOf` / `nativeScriptsLossOf` → `scriptsNotCarried`
  (`packages/interop-core/src/workspace/unkept-parts.ts`).
- **Momentos.** Hay dos componentes casi gemelos: `EventScripts.tsx` en Request (sync) y
  `SettingsScriptsSection.tsx` en Realtime (async, diálogo de la conexión). Pestañas
  horizontales con un `Switch` por momento.
- **`SCRIPTS.md`** (raíz) documenta la API corta y la tabla `pm.*` → Mandor.

Dolor: hay que saberse la API de memoria. Un script de Postman no se pega para arreglarlo. El panel
de importados duplica superficie.

Ganancia, en palabras del usuario: lo que llega de Postman, Bruno o Insomnia entra en el editor de
su momento. Da error y el usuario lo corrige, o acepta la bombilla. El completado conoce la API,
las variables con su valor, los headers y los campos de la respuesta: «igual que Postman, y hasta
mejor».

## Decisiones base

### API y engine

- **Un namespace, `mandor.`, con nombres completos.** Quedan `mandor.variables.get`,
  `mandor.request.headers.set`, `mandor.response.time` (milisegundos en el JSDoc), `mandor.test`,
  `mandor.expect`, `mandor.sendRequest`, `mandor.message` y `mandor.socket`. Nada abreviado: no
  hay `vars`. Sueltos quedan solo los nombres estándar de JS: `console`, `atob`, `btoa`,
  `URLSearchParams`. Con un solo nombre de dominio, los demás nombres son del usuario, y lo que
  escribe se lee sin glosario.
- **El texto del usuario va en un bloque propio.** Va dentro del cuerpo de la función, como
  `{ … }`. El único parámetro de dominio es `mandor`. `const response` y hasta `const mandor` se
  declaran sin SyntaxError: sombrean. `SCRIPT_FIRST_LINE` sigue al cambio, para que la línea de un
  error siga apuntando al texto del usuario.
- **`SCRIPT_API` sigue siendo la única fuente.** Gana la doc de cada parámetro. De ella salen el
  guest, el `.d.ts` y `SCRIPTS.md`.
- **Un `.d.ts` por momento.** Lo genera `scriptTypesOf(event, describe)` en `script` (puro), con
  JSDoc en el idioma de la interfaz: `describe` son los mensajes de `collections`.
  `mandor.response` no existe en Antes del request, y eso es un error de tipos, no silencio.
  `Assertion` declara el subconjunto de chai que da el guest de `expect`.

### Editor

- **Servicio TypeScript de Monaco 0.57, solo para scripts.**
    - Lenguaje propio `script` con la gramática de javascript, como `schema-language.ts` hace con
      `json`, y defaults propios. Así los visores de JS de solo lectura (snippets, body) siguen sin
      TS y `register.js` del TS de Monaco no se importa.
    - Carga perezosa: arranca con el primer modelo `script`. Se apaga cuando no queda ninguno y pasa
      una espera.
    - Cada documento es módulo (`moduleDetection: force`): dos scripts abiertos no comparten nombres.
    - `checkJs` activo. `lib` es `es2023`, sin DOM, porque QuickJS no tiene DOM.
    - Se callan los diagnósticos de lo que el engine sí acepta: `return` y `await` fuera de función.
- **Declaración por documento, no global.** Los extraLibs de Monaco son globales: dos momentos
  abiertos se pisarían. Un worker propio, subclase de `TypeScriptWorker`, añade la declaración
  del documento al final del texto que lee. El modelo no la ve y las posiciones no se mueven. La
  ventana la cambia con un método propio del worker cuando cambia el contexto.
- **Worker primero; hilo de la ventana si no arranca.** La fase 4 empieza por probar el worker
  bajo `mandor://app`, en build y empaquetado. Si no arranca tras darle al esquema lo que pida
  (privilegio `corsEnabled`, tipo MIME del handler), el servicio corre en el hilo de la ventana,
  como `schema-service.ts`, y el editor le habla igual. Los checks valen para los dos caminos. El
  camino tomado y su medida se escriben en la fase al cerrarla.
- **`ui` no sabe de scripts.** Recibe opciones genéricas en `EditorOptions`: `declarations` (texto
  `.d.ts`), `suggest` (ya existe), `ghostText` y `fixes`. `collections` las arma con `script`.
- **La app junta el contexto.** `collections` no importa `env` (`features-do-not-import-features`).
  Cada app reúne el contexto (variables con su valor ya enmascarado, headers, forma de la
  respuesta) y lo pasa como prop. `maskOf` (`packages/env/src/lib/secret-mask.ts`) enmascara en
  la app, igual que en las tablas. El script no puede leer un secreto: verlo en claro en el
  completado no tendría uso.

### Completado

- **Completado con contexto.**
    - Dentro de `mandor.variables.get("` salen las variables con su valor: del entorno, de la
      colección y las que la cadena declara con `mandor.variables.set("x"` (colección, carpeta,
      request y el texto actual). Un secreto sale enmascarado, con la marca «secreto».
    - Dentro de `mandor.request.headers.get("` salen los headers del request.
    - `mandor.response.json()` se tipa con la forma del ejemplo o de la última respuesta. En
      Realtime, `mandor.message.json()` se tipa con el último marco recibido. Cada nivel lleva firma
      de índice `any`: completa sin inventar errores.
    - Los snippets van dentro del completado (tipo `snippet`), sin panel aparte.
- **Texto fantasma por reglas, sin IA.** Tras `mandor.variables.set(`, si una variable del entorno
  se llama como un campo de la respuesta, propone `"<var>", mandor.response.json().<ruta>)`. Tab
  lo acepta.

### Importar, disco y exportar

- **Importar nunca ejecuta ni reescribe.** El script entra tal cual en el editor de su momento,
  sin aprobar, con la banda de confianza. Si estaba desactivado en la otra app, entra con
  `enabled: false`. Momentos:

    | Origen   | Antes del request    | Después de la respuesta                                                      |
    | -------- | -------------------- | ---------------------------------------------------------------------------- |
    | Postman  | `prerequest`         | `test`                                                                       |
    | Insomnia | `preRequestScript`   | `afterResponseScript`                                                        |
    | Bruno    | `script:pre-request` | `script:post-response`, y después `tests`, separados por una línea en blanco |

- **`importedScripts` muere entero:** schema, IR, host, formatos, ventana e i18n. `InteropScript`
  pierde `dialect`. `ScriptDialect` e `ImportedScript` desaparecen.
- **El disco viejo se funde una vez.** `REPO_FORMAT` pasa de 2 a 3.
    - `migrateRepoFormat` funde `importedScripts` en el script propio del mismo momento, en request,
      carpeta y colección. Orden: texto propio, línea en blanco, texto importado.
    - El script del workspace va al principio de la raíz de cada colección del workspace. Corría
      para todo request, y ahí sigue corriendo para todos.
    - La clave se borra con `writeDocument(…, { importedScripts: undefined })`, que conserva los
      comentarios.
    - La migración se dispara solo por versión: antes del release no hay orígenes fuera de
      desarrollo.
    - Un bundle viejo (formato mandor) se funde al leerlo, con la misma función pura
      (`foldImportedScripts`, en `schema`).
    - El texto fundido cambia el hash, así que el script vuelve a pedir aprobación. Es lo correcto:
      es otro texto.
- **Exportar sale tal cual.** Los scripts propios salen sin traducir: Postman `event`
  prerequest/test, Insomnia preRequestScript/afterResponseScript, Bruno
  `script:pre-request`/`script:post-response`. El texto hace ida y vuelta intacto. Los scripts de
  conexión de Realtime siguen sin salir (`scriptsNotCarried`): ningún formato los tiene.
  `UnkeptLevels.scriptsIn` pasa a `writesScripts: boolean`, y `scriptsLossOf` (por dialecto)
  desaparece.

### Traductor y componente

- **Traductor por árbol, y solo a pedido.**
    - Usa acorn + acorn-walk + magic-string, en `script/src/dialects/`.
    - Solo toca identificadores libres: `pm`, `postman`, `insomnia`, `bru`, `req`, `res`, y los
      `test`/`expect` sueltos de Bruno. Un `const pm` del usuario no se toca.
    - Lleva una tabla por dialecto (`mandor/no-kind-branch`).
    - Lo que no tiene traducción queda igual y sigue marcado.
    - Lo ofrece la bombilla, «Convertir a mandor.», en la línea o en todo el script. Nunca corre solo.
- **Un componente de momentos para las dos apps.** `ScriptsByEvent`, en `collections`:
    - a la izquierda, lista vertical: el momento, un punto si tiene código, el texto apagado si
      `enabled: false`;
    - a la derecha, el editor, con el interruptor en su cabecera y la banda de confianza encima.
      Es la forma de Postman 11. En Request sirve a request, carpeta y colección. En Realtime sirve a
      la sección Scripts del diálogo de la conexión, que se queda donde está.

## No entra aquí

- `setNextRequest`, datasets, visualizador, módulos, variables de script persistidas, scripts de
  workspace y scripts por mensaje en Realtime: siguen fuera de v1, en `pendiente.md` §6.
- Runner de colección: `pendiente.md` §5.
- CLI que corre scripts: H12 [02](../hito-12/02-cli.md). Este plan no mueve la cadena de host
  (`run-chain.ts`, `run-on-worker.ts`, `serve-scripts.ts`, `approved-scripts.ts`).
- Completado con IA: no. Tipos y reglas.
- Traducir `mandor.` a `pm.` al exportar: no. Decisión del usuario del 2026-11-22.
- Formatear el script en la ventana: nadie lo pidió.

## Librerías antes que código

| Pieza                                        | Candidata                                                                                    | Decisión                                                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos, completado, firma, hover, diagnóstico | Servicio TS de `monaco-editor` 0.57.0 (MIT, 2026-11-21, ya instalado; trae TypeScript 5.9.3) | Entra sin dependencia nueva. Se usan `WorkerManager` y los adaptadores de `tsMode.js` (`SuggestAdapter`, `SignatureHelpAdapter`, `QuickInfoAdapter`, `DiagnosticsAdapter`, `CodeActionAdaptor`). `register.js` no se importa |
| Prueba del `.d.ts`                           | `typescript` 6.0.3 (Apache-2.0, 2026-11-21, ya en la raíz)                                   | Entra como devDependency de `script`, misma versión exacta. El test compila contra el `.d.ts` un script válido y uno inválido                                                                                                |
| Parser del traductor                         | `acorn` 8.19.0 (MIT, 2026-10-05)                                                             | Entra en `script`. Ya está en el lockfile como transitiva. `@babel/parser` pesa unas diez veces más y trae JSX y TS, que aquí sobran                                                                                         |
| Recorrido del árbol                          | `acorn-walk` 8.3.5 (MIT, 2026-02-19)                                                         | Entra. `ancestor` dice si un identificador es libre                                                                                                                                                                          |
| Reescritura que conserva el formato          | `magic-string` 1.4.5 (MIT, 2026-10-27)                                                       | Entra. Reemplaza rangos y conserva comentarios y blancos. Rechazados `recast` y `escodegen`: reimprimen el script entero                                                                                                     |
| Traducción ya hecha                          | `@usebruno/converters` (traduce `pm` a `bru`)                                                | No entra: apunta a Bruno y arrastra `jscodeshift`. Su tabla sirve de referencia                                                                                                                                              |
| Leer scripts de `.bru`                       | `@usebruno/lang` 0.41.0 (ya dependencia)                                                     | Ya parsea `script:pre-request`, `script:post-response` y `tests`                                                                                                                                                             |

## Las dos apps

| Pieza                                                                    | Dónde vive                                                                                                        | Quién la usa                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API `mandor.`, engine, `scriptTypesOf`, `declaredVariablesOf`, traductor | `packages/script`                                                                                                 | Las dos: host corre el script, la ventana lo tipa                                                                                                                               |
| Fundir `importedScripts`                                                 | `packages/schema` (función), `store-fs` (migración), `interop-formats/src/mandor` (bundle)                        | Las dos                                                                                                                                                                         |
| Import y export tal cual                                                 | `packages/interop-formats` (postman, insomnia, bruno)                                                             | Request. Realtime no recibe scripts de conexión de ningún formato                                                                                                               |
| Lenguaje `script`, servicio TS, texto fantasma, arreglos                 | `packages/ui`                                                                                                     | Las dos                                                                                                                                                                         |
| `ScriptsByEvent`, `ScriptEditor`, completado de contexto                 | `packages/collections`                                                                                            | Las dos                                                                                                                                                                         |
| Contexto del script                                                      | `apps/sync/…/requests/lib/request-script-context.ts`, `apps/async/…/connections/lib/connection-script-context.ts` | Cada app el suyo. Filas «`{{var}}` resuelve contra» y «Scripts» de `mandor.md`: entorno del workspace y respuesta en Request; entorno de la conexión y último marco en Realtime |

## Criterios de entrada

No nace ningún paquete. Lo nuevo entra en paquetes que ya existen y ya sirven a las dos apps.

Dependencias nuevas:

- `acorn`, `acorn-walk` y `magic-string` en `script`, porque las pide el traductor;
- `typescript` como devDependency de `script`, porque la pide el test del `.d.ts`.

El plan B del worker (servicio en el hilo de la ventana) entra solo si la prueba de la fase 4 lo
pide. Se escribe en la fase, con lo que se midió.

### [x] Fase 1: La API es `mandor.` con nombres completos y cada momento tiene su `.d.ts`

**Objetivo.** Un script escribe `const response = await mandor.sendRequest(…)` sin SyntaxError, y
la ventana tiene el `.d.ts` de cada momento, listo para el editor.

```check
absent packages/script/src/api/script-api.ts "'vars.get'"
absent packages/script/src/api/script-api.ts "timeMs"
contains packages/script/src/api/script-api.ts "'variables.get'"
no-file packages/script/src/engine/guest/vars-guest.ts
file packages/script/src/engine/guest/variables-guest.ts
tested packages/script/src/engine/guest/variables-guest.ts
matches packages/script/tests/engine /const response = await/
file packages/script/src/api/script-types-of.ts
tested packages/script/src/api/script-types-of.ts
exports @mandor/script scriptTypesOf
no-match packages/i18n/src/lang /"vars": \{/
contains SCRIPTS.md "mandor.variables.get("
absent SCRIPTS.md "vars.get("
```

**Cambios.**

- `script-api.ts`:
    - `ScriptApiObject` deja `mandor` y los cuatro nombres estándar.
    - Las entradas se renombran a nombres completos y relativos a `mandor` (`variables.get`,
      `variables.replaceIn`, `response.time`, `request.headers.set`…).
    - `ApiEntry` gana `parameters: readonly { name; docKey }[]`, con claves `script.param.<entrada>.<parámetro>`.
    - `API_BY_EVENT` sigue diciendo qué existe en cada momento.
- `script-source.ts` y `guest/frame-guest.ts`:
    - el guest arma un solo objeto `mandor` con lo que da el momento;
    - el texto del usuario va dentro de `{ … }`;
    - `SCRIPT_FIRST_LINE` se recalcula.
    - Tests nuevos en `tests/engine/`: `const response = await mandor.sendRequest(…)` en
      onResponse corre; `const mandor = 1` también; un error en la línea 1 del usuario se reporta en
      la línea 1.
- `guest/vars-guest.ts` pasa a `variables-guest.ts`, y su test con él. El resto de guests cambia
  solo el nombre bajo el que se cuelga.
- `script-types-of.ts`, nuevo: `scriptTypesOf(event, describe)` devuelve el texto `.d.ts`:
    - interfaces por objeto, solo con lo que el momento expone;
    - `declare const mandor`;
    - JSDoc con `@param` desde `describe`;
    - `Assertion` con el subconjunto de chai del guest de `expect`;
    - `json(): any` por ahora (la forma llega en la fase 5).
    - Test node con `typescript` (devDependency nueva de `script`, 6.0.3): cero diagnósticos para un
      script válido de cada momento, y error para `mandor.response` en onBeforeRequest.
- i18n `collections.json` (es, en):
    - `script.api.vars.*` pasa a `script.api.variables.*`;
    - `response.timeMs` pasa a `response.time`;
    - bloque nuevo `script.param.*`, con una frase por parámetro;
    - después, `npm run i18n`.
- Host: lo que lee las entradas por nombre (efectos de `variables.set`, cuentas) sigue al
  renombre. La cadena (`run-chain.ts`…) no cambia de forma.
- E2e `scripts.spec.ts`, `script-attacks.spec.ts` y `script-memory.spec.ts` de las dos apps:
  pasan a escribir con `mandor.`.
- `SCRIPTS.md`: la sección The API se reescribe contra `SCRIPT_API`, con nombres completos. La
  tabla de otras apps se toca en la fase 6.

**No hacer.** No tocar el editor ni el completado de hoy, más allá del renombre que su test pida.
Nada de importación.

**Cierre.** `npm run ci:test -- packages/script` en rojo y verde; `npm run ci:check -- <rutas>`;
`npm run ci:verify`; `npm run ci:local` (los e2e de las dos apps escriben con `mandor.`). Con la
app abierta, en las dos apps: un script con `const response = await mandor.sendRequest(…)` corre y
su resultado sale en Tests/Consola (Request) o en la actividad (Realtime).

### [x] Fase 2: Lo importado entra en el editor de su momento y el panel de importados no existe

**Objetivo.** Lo que llega de Postman, Insomnia y ahora Bruno queda en el script propio de su
momento, sin aprobar. Exportar saca los scripts propios tal cual. Un origen viejo se funde al
abrirse.

```check
no-file packages/schema/src/script/imported-script.ts
no-file packages/schema/src/script/imported-script-schema.ts
no-file apps/sync/src/renderer/features/requests/components/scripts/RequestImportedScripts.tsx
no-file apps/sync/src/renderer/features/requests/lib/convert-imported-script.ts
absent packages/schema/src/workspace/workspace.ts "importedScripts"
absent packages/interop-core/src/ir/interop-document.ts "dialect"
no-match packages/interop-formats/src/postman /importedScripts/
no-match packages/interop-formats/src/insomnia /importedScripts/
no-match packages/host/src /importedScripts/
no-match apps/sync/src /importedScripts/
no-match packages/i18n/src/lang /importedScriptsNotice|scriptConvert/
contains packages/schema/src/repo/repo-format.ts "REPO_FORMAT = 3"
file packages/schema/src/script/fold-imported-scripts.ts
tested packages/schema/src/script/fold-imported-scripts.ts
exports @mandor/schema foldImportedScripts
contains packages/store-fs/src/repo/migrate-repo-format.ts "foldImportedScripts"
file packages/interop-formats/src/bruno/document/read-bru-scripts.ts
tested packages/interop-formats/src/bruno/document/read-bru-scripts.ts
file packages/interop-formats/src/bruno/export/script-blocks.ts
tested packages/interop-formats/src/bruno/export/script-blocks.ts
absent packages/interop-formats/src/bruno/bruno-format.ts "scriptsIn: 'none'"
```

**Cambios.**

- **Schema.**
    - Se borran `imported-script.ts` y `imported-script-schema.ts`, y la clave en request
      (`request-item*.ts`), carpeta, colección, workspace y bundle.
    - `fold-imported-scripts.ts`, nuevo y puro: `foldImportedScripts(ownScripts, imported)` devuelve
      los scripts propios con el importado del mismo momento detrás, tras una línea en blanco.
      También admite «delante», para el nivel workspace. Tipa la forma vieja en local: el schema
      global ya no la conoce.
    - `REPO_FORMAT = 3`.
- **Migración.**
    - `store-fs/src/repo/migrate-repo-format.ts` recorre request, carpeta y colección, y los funde.
    - El script del workspace va al principio de la raíz de cada colección del workspace.
    - La clave se borra con `writeDocument`.
    - `needsFormatMigration` mira solo la versión. El motivo va en un comentario: antes del release
      no hay orígenes fuera de desarrollo.
    - Test fs con un origen de formato 2 en disco real: fundido, comentarios intactos, formato 3
      sellado.
- **IR e interop-core.**
    - `InteropScript` pierde `dialect`.
    - `resource-parts.ts`, las huellas y `workspace-data.ts` dejan la clave.
    - En `unkept-parts.ts`, `scriptsIn` pasa a `writesScripts`. `scriptsLossOf` se borra; queda una
      sola pérdida, la de un formato que no escribe scripts.
- **Postman e Insomnia.**
    - `import/scripts-of.ts` escribe `scripts` propios por momento. Un script desactivado entra con
      `enabled: false`, y la degradación `scriptDisabled` se va.
    - `scriptAsText` se va: el script ya no queda «como texto».
    - Export: `script-events.ts` (Postman) e Insomnia `scripts-document.ts` sacan los scripts
      propios tal cual, de request, carpeta y colección.
- **Bruno.**
    - `document/read-bru-scripts.ts` lee `script:pre-request`, `script:post-response` y `tests` de
      `.bru` (`@usebruno/lang`) y de OpenCollection (`scripts`, hoy `z.unknown()` en
      `opencollection-schema.ts`, que se tipa). Los tests van al final de Después de la respuesta.
    - Sale de `leftOut`.
    - `export/script-blocks.ts` escribe los dos bloques en OpenCollection.
    - `bruno-format.ts` pasa a `writesScripts: true`.
- **Mandor (bundle).** `mandor/import/collection-resources.ts` funde un bundle viejo con
  `foldImportedScripts`.
- **Host.** `import/carried-settings.ts`, `import-existing.ts`, `own-collection.ts`,
  `write-entry.ts`, `write-workspace-entry.ts` y `export/workspace-data-of.ts` dejan la clave. El
  workspace guarda solo `auth`. Los scripts de la raíz de una colección de Postman van a la raíz
  de la colección.
- **Ventana Request.**
    - Se borran `RequestImportedScripts.tsx` y `convert-imported-script.ts`.
    - `RequestScripts.tsx`, `FolderScripts.tsx`, `apply-curl.ts`, `section-marks.ts` (el punto mira
      solo `scripts`) y `main/request/request-scripts.ts` (sin cuenta `imported`) se ajustan.
    - `env` (`pending-folder-settings-write.ts`) e `ipc` (`collection-settings-write.ts`) dejan la
      clave.
- **Exchange.** `scripts-to-adjust-in.ts` cuenta los `scripts` llegados. El aviso
  `scriptsToAdjust_one/_other` de `import.json` se reescribe: «llegaron N scripts de otra app, en
  su editor y sin aprobar».
- **i18n.** `requests.json` borra `importedScriptsNotice`, `scriptConvert`, `scriptConverted` y
  `scriptConvertUndo`. Después, `npm run i18n`.
- **Tests.** Los de import y export de los tres formatos se reescriben: ida y vuelta del texto
  intacta en Postman, Insomnia y Bruno, y desactivado → `enabled: false`. El e2e de import de
  Request comprueba que el script queda en su editor con la banda de confianza y que no hay
  panel.

**No hacer.** No traducir nada: el traductor es de la fase 6. No cambiar las pestañas de momentos:
eso es la fase 3.

**Cierre.** `npm run ci:test -- packages/schema packages/store-fs packages/interop-core packages/interop-formats packages/host`;
`npm run ci:verify`; `npm run ci:local`. Con la app abierta, en Request:

- importar una colección de Postman con scripts, otra de Insomnia y otra de Bruno;
- cada script está en su momento, sin aprobar, y no hay panel de importados;
- exportar a Postman y volver a importar da el mismo texto;
- en Realtime, el import de AsyncAPI no cambia.

### [x] Fase 3: Un componente de momentos en las dos apps

**Objetivo.** Request (request, carpeta, colección) y Realtime (diálogo de la conexión) muestran
los scripts con el mismo componente: momentos en lista vertical, editor al lado, interruptor en su
cabecera y banda de confianza encima.

```check
file packages/collections/src/components/scripts/ScriptsByEvent.tsx
tested packages/collections/src/components/scripts/ScriptsByEvent.tsx
exports @mandor/collections ScriptsByEvent
no-file apps/sync/src/renderer/features/requests/components/scripts/EventScripts.tsx
contains apps/sync/src/renderer/features/requests/components/scripts/RequestScripts.tsx "ScriptsByEvent"
contains apps/sync/src/renderer/features/requests/components/folder/FolderScripts.tsx "ScriptsByEvent"
contains apps/async/src/renderer/features/connections/components/dialog/SettingsScriptsSection.tsx "ScriptsByEvent"
contains packages/ui/src/components/tabs/Tabs.tsx "orientation"
```

**Cambios.**

- `ui` `Tabs` gana `orientation` (`horizontal` por defecto, o `vertical`). Radix ya lo soporta:
  flechas arriba y abajo, y `aria-orientation`. `TabsList` pinta la columna con los tokens de
  siempre: estado gris, sin acento. Va al ui-lab.
- `ScriptsByEvent.tsx`, nuevo, se compone en árbol:
    - `ScriptsByEvent` es el contenedor; recibe `events`, `scripts`, `onChange` y `place`;
    - la lista de momentos va en `Tabs orientation="vertical"`: nombre del momento, punto si hay
      código (el mismo que `section-marks.ts` usa para la sección), texto apagado si
      `enabled: false`;
    - el panel lleva la cabecera (nombre del momento y `Switch` «Activo») y debajo `EventScript`,
      que ya trae la banda y el editor.
    - Recuerda el momento abierto con `useResourceSection`, como hoy.
    - Test jsdom: cambiar de momento, el punto, el interruptor y el teclado.
- Request: `RequestScripts.tsx` y `FolderScripts.tsx` montan `ScriptsByEvent` con
  `REQUEST_SCRIPT_EVENTS`. Se borra `EventScripts.tsx`.
- Realtime: `SettingsScriptsSection.tsx` monta `ScriptsByEvent` con `CONNECTION_SCRIPT_EVENTS`.
  La sección se queda en el diálogo.
- Ancho: la lista mide lo que pide su texto más largo, en una sola línea y con elipsis
  (`chrome-single-line`). El editor llena el resto. En el diálogo de Realtime se comprueba el
  ancho mínimo.

**No hacer.** No tocar el editor: el TS es de la fase 4. Nada de contexto.

**Cierre.** `npm run ci:test -- packages/ui packages/collections`; `npm run ci:verify`;
`npm run ci:local`. Con las dos apps abiertas, en claro y oscuro: lista vertical, punto, interruptor
y teclado (flechas, Tab), y el diálogo de Realtime sin desbordar. `npm run dev:lab` enseña
`Tabs` vertical.

### [x] Fase 4: El editor de scripts tiene tipos, firma, hover y diagnóstico

**Objetivo.** Al escribir `mandor.` salen los miembros del momento, con su doc en el idioma de la
interfaz. Al abrir paréntesis sale la firma. El hover explica. Un error de tipos se subraya. El
servicio arranca solo con un editor de script y se apaga sin él.

```check
file packages/ui/src/editor/monaco/script-language.ts
tested packages/ui/src/editor/monaco/script-language.ts
file packages/ui/src/editor/monaco/script-service.ts
tested packages/ui/src/editor/monaco/script-service.ts
contains packages/ui/src/editor/editor-language.ts "'script'"
contains packages/ui/src/editor/editor-options.ts "declarations"
contains packages/ui/src/editor/monaco/monaco-setup.ts "parameterHints"
matches packages/collections/src/components/scripts/ScriptEditor.tsx /language="script"/
no-file packages/collections/src/lib/script-suggestions.ts
file apps/sync/tests/e2e/script-editor.spec.ts
file apps/async/tests/e2e/script-editor.spec.ts
contains apps/sync/tests/e2e/script-memory.spec.ts "the script service stops"
contains apps/async/tests/e2e/script-memory.spec.ts "the script service stops"
```

**Cambios.**

- **Prueba primero.** Un worker mínimo en `ui` con `MonacoEnvironment.getWorker(_, label)`,
  creado con `new Worker(new URL(…, import.meta.url), { type: 'module' })`, y un e2e que lo ve
  responder en las dos apps (build servido por `mandor://app`).
    - Si no arranca, se mira el handler del esquema (tipo MIME del `.js`) y el privilegio
      `corsEnabled` de `registerRendererScheme`.
    - Si sigue sin arrancar, se toma el plan B: el servicio corre en el hilo de la ventana. El
      motivo medido se escribe aquí.
    - Se corrigen los comentarios desfasados de `main-thread-diff.ts` y `schema-service.ts`.
- **`script-language.ts`**, nuevo:
    - registra el id `script` con la gramática y la configuración de javascript;
    - al primer modelo `script`, carga en diferido `script-service.ts`;
    - al disponerse el último, programa la parada (`// timing-policy:` con su motivo).
    - Test jsdom con temporizadores falsos: arranque perezoso, una sola instancia y parada.
- **`script-service.ts`**, nuevo:
    - trae `WorkerManager` y los adaptadores de `tsMode.js`;
    - registra completado, firma, hover y diagnóstico solo para `script`;
    - los defaults son propios: `allowJs`, `checkJs`, `moduleDetection: force`, `lib: ['es2023']`,
      y se callan los diagnósticos del engine (`return` y `await` de nivel superior).
- **Worker propio** (`script-ts-worker.ts`): subclase de `TypeScriptWorker`.
    - `getScriptSnapshot` devuelve el texto más la declaración de ese archivo.
    - `setDeclarations(uri, text)` guarda la declaración y sube la versión.
    - Descarta los diagnósticos que caen en el tramo añadido.
- **Opciones de `ui`.** `editor-language.ts` añade `'script'`. `editor-options.ts` añade
  `declarations?: string`; `mount-editor.ts` la pasa al servicio por URI del modelo.
- **`monaco-setup.ts`** importa `parameterHints` (y lo que pidan los adaptadores) y no importa el
  `register.js` de TypeScript.
- **`collections`.**
    - `ScriptEditor.tsx` pasa a `language="script"` y
      `declarations={scriptTypesOf(event, describe)}`, memorizado por momento e idioma.
    - Se borra `script-suggestions.ts`.
- **Memoria.**
    - `script-memory.spec.ts` (las dos apps) añade «the script service stops when no script editor
      is open»: abrir y cerrar el editor N veces deja el heap de la ventana en su base, y el worker
      termina tras la espera.
    - `script-editor.spec.ts`, nuevo en las dos apps: completado de `mandor.`, firma, hover y
      subrayado de `mandor.response` en Antes del request (o Antes de conectar).
- **Empaquetado.** Una vez, a mano: `npm run dist` en `apps/sync` y abrir el instalador real. El
  editor de script completa dentro del asar.

**No hacer.** Nada de variables, headers, campos de JSON ni snippets: es la fase 5. Nada de
bombilla: es la fase 6.

**Notas.**

- El worker arranca bajo `mandor://app` en las dos apps sin tocar el esquema: lo prueba «the
  service of scripts runs in a thread of its own». No hizo falta el plan B.
- Camino tomado: cliente propio (`script-service.ts`, `script-providers.ts`,
  `script-diagnostics.ts`) sobre `editor.createWebWorker`, en vez de `WorkerManager` y los
  adaptadores de `tsMode.js`. Esos traen `internal/common/workers.js`, que registra todas las
  contribuciones y levanta un worker por cada modelo `javascript`.
- El worker contesta vacío por un script que la ventana ya soltó (una pregunta viaja mientras la
  pestaña se cierra) y resuelve el nombre que TypeScript normaliza: la clave de un documento
  lleva `//` y TypeScript lo colapsa al leerlo como ruta.
- La columna de momentos de la fase 3 no es una tira: `openSection` (soporte e2e de `ui`) busca
  ahora en cualquier lista de pestañas. Los e2e de scripts de Request estaban rotos desde esa fase.
- RAM (proceso de la ventana de Request, working set, Docker): 217 MB en reposo, 299 MB con el
  servicio encendido tras `mandor.` (+82 MB, el hilo de TypeScript cuenta en el proceso), 211 MB
  tras cerrar la pestaña y parar el servicio.
- Empaquetado: en vez del `npm run dist` a mano, `installed-smoke.spec.ts` de Realtime comprueba
  el completado de `mandor.` sobre el instalador real, en Linux y Windows (`update-e2e`).

**Cierre.** `npm run ci:test -- packages/ui packages/collections`; `npm run ci:verify`;
`npm run ci:local`. Con las dos apps abiertas:

- escribir `mandor.` en cada momento y ver los miembros, la firma, el hover y el subrayado;
- abrir y cerrar pestañas con script y ver en DevTools (`F12`, Memory) que el heap vuelve;
- anotar en esta fase la RAM que suma el servicio encendido.

### [x] Fase 5: El completado conoce las variables, los headers y la respuesta

**Objetivo.** Dentro de `mandor.variables.get("` salen las variables con su valor (los secretos,
enmascarados). Salen los headers del request. `mandor.response.json().` completa los campos de la
respuesta. Los snippets aparecen en el completado. Tras `mandor.variables.set(`, el texto fantasma
propone guardar un campo de la respuesta.

```check
file packages/script/src/api/script-context.ts
tested packages/script/src/api/script-context.ts
file packages/script/src/api/declared-variables-of.ts
tested packages/script/src/api/declared-variables-of.ts
exports @mandor/script declaredVariablesOf
file packages/collections/src/lib/script-completions.ts
tested packages/collections/src/lib/script-completions.ts
contains packages/ui/src/editor/editor-suggestion.ts "'snippet'"
contains packages/ui/src/editor/editor-options.ts "ghostText"
file packages/ui/src/editor/monaco/ghost-text.ts
tested packages/ui/src/editor/monaco/ghost-text.ts
contains packages/ui/src/editor/monaco/monaco-setup.ts "inlineCompletions"
file apps/sync/src/renderer/features/requests/lib/request-script-context.ts
tested apps/sync/src/renderer/features/requests/lib/request-script-context.ts
file apps/async/src/renderer/features/connections/lib/connection-script-context.ts
tested apps/async/src/renderer/features/connections/lib/connection-script-context.ts
```

**Cambios.**

- **`script` (puro).**
    - `script-context.ts`: tipo `ScriptContext` = `variables` (nombre, valor ya enmascarado,
      `secret`, origen: entorno | colección | script), `headers` y `sample` (JSON de ejemplo o
      `undefined`), más `EMPTY_SCRIPT_CONTEXT`.
    - `scriptTypesOf(event, describe, context)` tipa `json()` con la forma de `sample`: firma de
      índice `any` en cada nivel, y `any` si no hay muestra. También tipa los nombres de variable
      como unión abierta (`"a" | "b" | (string & {})`), para que el hover y la firma los enseñen.
    - `declared-variables-of.ts`: `declaredVariablesOf(texts)` busca
      `mandor.variables.set("x"` (comillas simples, dobles y plantilla sin interpolar) en los textos
      de la cadena. Cobertura 100 %.
- **`collections`.**
    - `script-completions.ts` arma el `SuggestionsOf` de contexto: dentro del string de
      `variables.get/set/has(` da las variables con valor en `detail` (secreto: máscara y «secreto»
      en `documentation`); dentro de `request.headers.get/has/delete(` da los headers; en cualquier
      lugar, los snippets del momento (variable desde la respuesta, test de estado, test de campo,
      header desde variable, `sendRequest`).
    - El texto fantasma: tras `mandor.variables.set(`, si una variable del entorno se llama como un
      campo de `sample`, devuelve `"<var>", mandor.response.json().<ruta>)` (en Realtime,
      `mandor.message.json()`).
    - `ScriptsByEvent` y `ScriptEditor` reciben `context: ScriptContext` como prop.
- **`ui`.**
    - `EditorSuggestion.kind` gana `'snippet'`; `editor-suggestions.ts` lo inserta como snippet de
      Monaco (`InsertAsSnippet`).
    - `ghost-text.ts`, nuevo: un proveedor de inline completions por lenguaje, a partir de
      `ghostText?: (text, offset) => string | undefined`.
    - `monaco-setup.ts` importa `inlineCompletions` y `snippet`.
    - Tests jsdom: snippet insertado con sus tabstops; texto fantasma aceptado con Tab.
- **Request.** `request-script-context.ts` junta, desde los stores de la ventana:
    - variables del entorno activo del workspace y de la colección, enmascaradas con `maskOf`;
    - variables declaradas por la cadena de scripts (colección, carpeta y request);
    - headers del request;
    - `sample` del ejemplo guardado, o de la última respuesta si es JSON.
      `RequestScripts` y `FolderScripts` lo pasan.
- **Realtime.** `connection-script-context.ts` junta las variables del entorno de la conexión, las
  declaradas y, como `sample`, el último marco recibido si es JSON. `SettingsScriptsSection` lo
  pasa.
- **Rendimiento.** El `.d.ts` y las sugerencias se recalculan solo cuando cambia el contexto
  (selector estable, sin efectos derivados). Una respuesta grande se recorta a una forma de
  profundidad y anchura acotadas antes de tiparla. El tope, con su motivo, va en
  `script-context.ts`.

**No hacer.** Ninguna sugerencia deja de lado la API ni se inventa variables. Ningún valor de
secreto en claro. Nada de IA.

**Notas.**

- Los snippets salen donde empieza una sentencia, no a mitad de una expresión: ahí escribirían
  una sentencia donde va un valor. Es la lectura de «en cualquier lugar».
- Lo compartido sube de las apps: `listedVariables(scope, declared)` en `env` (orden del scope,
  máscara de secretos, nombres declarados al final); `useDeclaredInScripts` en `collections`
  (misma lista mientras los nombres no cambian, así teclear no rehace el `.d.ts`);
  `sentHeaderNames` en `script`.
- Realtime también da los headers del handshake: `onBeforeConnect` los escribe. El store de
  actividad se lee hasta el texto del último marco recibido (`lastReceivedText`): un marco enviado
  o una línea de la consola no rehacen el contexto. Un último marco binario no da muestra.
- Los hooks son `useRequestScriptContext`, `useFolderScriptContext` y
  `useConnectionScriptContext`; las sugerencias de TypeScript que repiten un nombre ya ofrecido
  se quitan (`suggestedAt`), así una variable no sale dos veces.
- Comprobado en las dos apps reales por e2e (`script-editor.spec.ts`): el nombre declarado sale
  dentro de `variables.get("` y el snippet se escribe al aceptarlo. La máscara, los campos de la
  muestra y el texto fantasma con Tab, en jsdom.

**Cierre.** `npm run ci:test -- packages/script packages/collections packages/ui apps/sync apps/async`;
`npm run ci:verify`; `npm run ci:local`. Con las dos apps abiertas:

- con un entorno que tiene un secreto, ver la máscara en el completado;
- tras enviar un request, `mandor.response.json().` completa sus campos;
- en Realtime, tras recibir un marco JSON, `mandor.message.json().` hace lo mismo;
- el texto fantasma aparece y Tab lo acepta.

### [x] Fase 6: La bombilla convierte lo de Postman, Insomnia y Bruno a `mandor.`

**Objetivo.** Un script de otra app se subraya donde usa su API, con un mensaje en el idioma de la
interfaz. La bombilla «Convertir a mandor.» traduce esa línea o el script entero, sin tocar lo que
no tiene traducción.

```check
file packages/script/src/dialects/translate-script.ts
tested packages/script/src/dialects/translate-script.ts
file packages/script/src/dialects/postman-dialect.ts
tested packages/script/src/dialects/postman-dialect.ts
file packages/script/src/dialects/insomnia-dialect.ts
tested packages/script/src/dialects/insomnia-dialect.ts
file packages/script/src/dialects/bruno-dialect.ts
tested packages/script/src/dialects/bruno-dialect.ts
exports @mandor/script translateScript
matches packages/script/package.json /"acorn": "8\.19\.0"/
matches packages/script/package.json /"magic-string": "1\.4\.5"/
contains packages/ui/src/editor/editor-options.ts "fixes"
contains packages/ui/src/editor/monaco/monaco-setup.ts "codeAction"
contains SCRIPTS.md "bru.setEnvVar"
absent docs/specs/pendiente.md "scripts de Bruno"
absent docs/specs/mandor.md "scripts de Bruno"
```

**Cambios.**

- **`script/src/dialects/`.**
    - `translate-script.ts`: `translateScript(source, range?)` parsea con acorn
      (`ecmaVersion: 'latest'`, `allowAwaitOutsideFunction`, `allowReturnOutsideFunction`) y halla
      los identificadores libres con `acorn-walk` `ancestor`. Cada uso se resuelve contra las tablas
      de los tres dialectos y se reescribe con magic-string. Devuelve el texto y los usos que quedaron
      sin traducción.
    - También devuelve `foreignUsesOf(source)`, con los rangos de API ajena, para el subrayado.
    - Si el texto no parsea, no traduce y lo dice.
    - Cobertura 100 %.
    - `postman-dialect.ts`, tabla:
        - `pm.environment|variables|collectionVariables|globals.get|set|unset|has` →
          `mandor.variables.*`;
        - `pm.request.headers.add({key, value})` → `mandor.request.headers.set(key, value)`;
        - `pm.response.json()` → `mandor.response.json()`;
        - `pm.response.code` → `.status`;
        - `pm.response.responseTime` → `.time`;
        - `pm.test`, `pm.expect` → `mandor.*`;
        - `pm.sendRequest(options)` sin callback → `await mandor.sendRequest(options)`. Con callback
          queda marcado: cambia el flujo.
        - Lo viejo, `postman.setEnvironmentVariable` y similares, también entra.
    - `insomnia-dialect.ts`: la misma forma, porque la API de Insomnia sigue a la de Postman.
    - `bruno-dialect.ts`:
        - `bru.getEnvVar|setEnvVar|getVar|setVar` → `mandor.variables.*`;
        - `req.getHeader|setHeader` → `mandor.request.headers.*`;
        - `res.getStatus()`, `res.status` → `mandor.response.status`;
        - `res.getBody()`, `res.body` → `mandor.response.json()`;
        - `test`, `expect` sueltos → `mandor.*`.
- **`ui`.**
    - `editor-options.ts` añade `fixes?: (text, range) => readonly EditorFix[]` (`title`, `edits`),
      servido por un proveedor de code actions por lenguaje.
    - `monaco-setup.ts` importa `codeAction` (la bombilla).
    - Un marcador propio, `foreign`, en el idioma de la interfaz, reemplaza el diagnóstico 2304 de
      TypeScript sobre `pm`, `bru` e `insomnia`: «Esto es de Postman: Convertir a mandor.». El 2304
      de esos nombres se calla en los defaults del servicio.
- **`collections`.** `ScriptEditor` arma `fixes` y el marcador desde `translateScript` y
  `foreignUsesOf`. La acción de todo el script va primero.
- **i18n.** Textos de la bombilla y del marcador por dialecto (es, en), y `npm run i18n`.
- **Dependencias.** `acorn` 8.19.0, `acorn-walk` 8.3.5 y `magic-string` 1.4.5 en `dependencies`
  de `script`, exactas.
- **Docs.**
    - `SCRIPTS.md`: «Scripts from other apps» con la tabla de los tres dialectos, lo que la bombilla
      traduce y lo que deja.
    - `pendiente.md` §6: sale «scripts de Bruno».
    - `mandor.md` §Scripts:
        - API `mandor.`;
        - editor con tipos y contexto;
        - lo importado entra en su momento sin aprobar;
        - export tal cual;
        - Bruno entra;
        - fuera de v1 sin «scripts de Bruno».
    - La fila de H11 pasa a `hecho`.

**No hacer.** La traducción nunca corre al importar ni al guardar. No se traduce al exportar.

**Notas.**

- Las tablas son `Map` de ruta (`pm.response.code`) a regla; la regla recibe el nodo nombrado, la
  llamada si la hay y si se puede esperar. Se toma la ruta más larga que la tabla conoce, así
  `pm.response.code.toString()` conserva lo que sigue.
- Un nombre que el script declara (`const pm = …`) es suyo, nunca de otra app, y `{ test }` no se
  toca: no se puede reescribir en su lugar.
- `pm.sendRequest(options)` solo se convierte si se puede esperar donde está (arriba del script o
  dentro de una función `async`); si no, o con callback, queda marcado. `unset` no tiene regla.
- `ui` no sabe de dialectos: `check` registra sus marcas por modelo (`explainModel`) y el
  servicio de TypeScript calla sus 2304, 2552 y 2582 dentro de ellas. La bombilla es un proveedor
  de code actions por lenguaje (`fixModel`), como el texto gris.
- El marcador es error: el nombre no existe al correr. La bombilla ofrece primero el script
  entero y, si las líneas del cursor tienen menos, solo esas líneas.

**Cierre.** `npm run ci:test -- packages/script packages/ui packages/collections`;
`npm run ci:verify`; `npm run ci:local`. Con Request abierta:

- importar una colección de Postman y otra de Bruno con scripts;
- ver el subrayado con su mensaje;
- convertir una línea, y después el script entero;
- lo que queda sin traducción sigue marcado;
- tras aprobar, el script corre.

En Realtime: pegar `pm.environment.get("x")` en Antes de conectar y convertirlo.

## Deudas

Ninguna todavía.
