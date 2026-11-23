# Plan 01 — Una publicación sale como archivo HTML o como enlace, sin servidor

> Escrito el 2026-11-22, antes de cerrar H11. Al abrir H12, re-anclar rutas y contratos contra el
> código: el plan 06 de H11 rehace scripts y el release toca empaquetado.

## Contexto

Hoy no hay forma de leer la API de un workspace fuera de Mandor. Lo que existe:

- Export: diálogo `ExportDialog` y árbol de elección en `packages/exchange`
  (`choice/components/tree/ChoiceTree.tsx`, `export/lib/export-choice-nodes.ts`). Las apps lo montan
  en `apps/*/src/renderer/app/*ExportAction.tsx` y `*ExportLine.tsx`. Sale a formatos de otros
  (Postman, OpenAPI, AsyncAPI): quien recibe necesita esa otra herramienta para leer.
- Lectura del workspace para export: `packages/host/src/export/workspace-data-of.ts`, luego IR de
  `packages/interop-core` (`selectWorkspaceData`, `workspaceToIr`). El IR ya trae ejemplos
  (`interop-core/src/ir/interop-document.ts`).
- Docs markdown del workspace: `packages/docs` (pestaña Doc). Render: `Markdown` de
  `packages/ui/src/components/markdown/Markdown.tsx` (`react-markdown` + `remark-gfm`, HTML crudo
  apagado).
- Snippets: `packages/codegen` (`snippetOf`), servido por main de Request
  (`apps/sync/src/main/codegen/`). Su librería pide Node: nunca corre en una ventana
  (`codegen-runs-in-main`).
- Formatos: la app los lista y se los pasa a `host` al arrancar (`apps/sync/src/main/formats.ts`);
  `host` no nombra ninguno (`host-names-no-format`).
- Variables: `packages/vars` (resolución, redacción, secretos). Puro.

Dolor: cliente o equipo sin Mandor no lee la API. Postman publica docs en su nube, con cuenta y
servidor suyos. Mandor no tiene nube ni la tendrá: nada local puede pasar a exigir remoto.

Ganancia: usuario elige una vez qué compartir, lo guarda, y saca cuando quiera un `.html` que abre
en cualquier navegador sin red, o un enlace para pegar en un chat. Costo de servidor: cero.

## Decisiones base

- **Publicación = recurso del workspace, guardado.** `workspaces/<ws>/publications/<slug>.yaml`:
  nombre, título, intro markdown, selección, lenguajes de snippet, entornos incluidos. Sincroniza
  como el resto. Rehacer la selección cada vez cansa, y el equipo comparte la misma.
- **Selección por id, no por copia.** Al sacar archivo o enlace se lee el disco de ese momento.
  Item borrado: sale de la selección, sin error ni aviso que bloquee. Docs siempre al día.
- **Un payload, dos transportes.** JSON versionado (`v: 1`), el mismo para archivo y enlace. Un
  lector, una batería de pruebas.
- **Archivo** = plantilla del lector + payload en `<script type="application/json">`. Abre sin red.
  Sirve para adjuntar, para hosting estático propio, para Pages del usuario.
- **Enlace** = lector estático en GitHub Pages del repo público + payload comprimido
  `deflate-raw`, en base64url, dentro del fragmento: `…/view/#v1.<datos>`. El fragmento nunca viaja
  al servidor: GitHub sirve el lector y no ve la doc. Gratis.
- **Lector = app web nueva, `apps/viewer`.** Vite + React, sin Electron. Su build es un solo
  `index.html` con JS y CSS dentro. Las apps de escritorio lo llevan como recurso (archivo, no
  código importado); el workflow de Pages publica el mismo build. Es app porque monta React en una
  página: raíz de composición. Un paquete no arranca nada.
- **Payload no confiable.** Cualquiera fabrica un enlace. El lector valida con zod, pinta markdown
  sin HTML crudo, deja enlaces solo `http:`, `https:` y `mailto:`, lleva CSP por `<meta>` con el
  hash de su script y `connect-src 'none'`, sin `eval`. Ninguna ejecución maliciosa por culpa
  nuestra.
- **Secreto nunca sale.** Variable marcada secreta: `{{nombre}}` sin valor, en archivo y en enlace.
  Lo prueba un centinela. Lo literal (token pegado en un header) sale como está: lo escribió el
  usuario. El diálogo muestra qué entornos van antes de sacar nada.
- **Snippets los arma main al publicar**, uno por request, lenguaje y entorno incluido, vecinos en
  el payload: `deflate` comprime las variantes casi gratis. El lector no corre `codegen` (pide
  Node). El diálogo enseña el largo del enlace en vivo: cada lenguaje y cada entorno cuesta, y el
  usuario lo ve antes de copiar.
- **Entorno en el lector.** Selector: resuelve con `@mandor/vars` lo que pinta (URL, params,
  headers, body) y elige la variante de snippet de ese entorno. Secreto queda `{{nombre}}`. Sin
  entorno elegido, todo se lee como se escribió.
- **Descargas (OpenAPI, Postman, AsyncAPI) solo en el archivo.** Main las genera con los
  exportadores de `interop-formats` que la app ya ofrece y van dentro. El enlace no las lleva: lo
  alargarían.
- **Enlace largo no se bloquea.** Se copia igual. Pasado un umbral (constante, 8 000 caracteres de
  partida) el diálogo dice que algunos chats lo cortan y que el archivo viaja mejor.
- **Versiones.** El lector publicado lee todo `v` que alguna app escribió. Cambio incompatible =
  `v` nueva + decodificador nuevo; uno viejo nunca se borra. Enlace viejo sigue abriendo.
- **Payload por contenido, no por app.** Trae `requests`, `connections`, `events`, `docs` según
  haya. El lector pinta lo que venga; ningún `if` por tipo de app.
- **Payload vive en `interop-formats` como formato `docs`.** Es un documento que Mandor escribe y
  otro programa lee, como los demás formatos: `document/` (esquema, fragmento), `export/` (IR →
  payload). No entra al menú de export: la única puerta es el diálogo Publicar. `host` no lo
  nombra: la app le pasa `docs`, sus formatos de descarga y, en Request, su función de snippets,
  igual que hoy le pasa `formats`.
- **Vista previa = el mismo archivo en el navegador del sistema** (temporal, `shell.openPath`).
  Usuario ve exactamente lo que verá quien reciba. Un lector dentro de la app pediría un paquete
  aparte, sin dolor que lo pida hoy.
- **Diálogo Publicar en `exchange`**, junto al export: reusa `choice/` sin cruzar features. Puertas:
  «Publicar…» en el menú de colección (preselecciona) y comando de paleta.

## No entra aquí

- Publicación construida en CI y carpeta alojada por el usuario: cuando exista la CLI (plan 02) y
  alguien lo pida. Al cerrar este plan se anota en `pendiente.md` §6.
- Lector dentro de la app: cuando alguien lo pida. Hoy, vista previa en navegador.
- «Probar» desde el lector (enviar un request): nunca. El lector no hace red.
- Snippets de conexión de Realtime: `pendiente.md` §5, «Snippets de conexión».
- Marca propia en la doc publicada (logo, colores): sin pedido.

## Librerías antes que código

| Pieza                        | Candidata                                                                     | Decisión                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Un solo HTML con JS y CSS    | `vite-plugin-singlefile` 2.3.4 (MIT, 2026-10-17)                              | Entra, solo en `apps/viewer`                                                                      |
| Compresión del fragmento     | `CompressionStream('deflate-raw')` nativo; `fflate`                           | Nativo: navegador y Node lo traen. `fflate` no entra                                              |
| base64url                    | `Uint8Array.prototype.toBase64` / `Uint8Array.fromBase64`, alfabeto base64url | Nativo (Chromium ≥140, Firefox ≥133, Safari ≥18.2, Node ≥25). Sin código propio                   |
| Markdown                     | `react-markdown` 10.1.0 + `remark-gfm` 4.0.1, vía `Markdown` de `@mandor/ui`  | Se reusa. Ya están                                                                                |
| Búsqueda                     | `match-sorter` 8.3.1                                                          | Se reusa. Ya está                                                                                 |
| Snippets                     | `@mandor/codegen`                                                             | Se reusa, en main de Request. Pide Node (`url`): el lector no lo carga                            |
| Resaltado de código          | `highlight.js` 11.12.0 (BSD-3-Clause, 2026-08-12); Monaco                     | Entra solo el núcleo y los lenguajes que `codegen` produce, más JSON. Monaco pesa megas: no entra |
| Validar payload no confiable | `zod` 4.6.7                                                                   | Se reusa. `zod/mini` en el lector si el presupuesto de peso lo pide                               |
| Hosting del lector           | GitHub Pages del repo público                                                 | Gratis, sin servidor propio                                                                       |
| Deploy                       | `actions/upload-pages-artifact` + `actions/deploy-pages`                      | Oficiales. Versión fijada como las demás actions; Dependabot las sube                             |

## Las dos apps

| Pieza                                      | Dónde vive                          | Quién la usa                             |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------- |
| Payload, builder, fragmento                | `interop-formats/src/docs/`         | `host` (main de las dos) y `apps/viewer` |
| Publicación: esquema, disco, IPC, handlers | `schema`, `store-fs`, `ipc`, `host` | Las dos apps, mismo PR                   |
| Diálogo Publicar y sus puertas             | `exchange`                          | Las dos apps, mismo PR                   |
| Snippets del payload                       | main de Request, sobre `codegen`    | Request; Realtime cuando haya §5         |
| Lector                                     | `apps/viewer`                       | Archivo (dentro de cada app) y Pages     |

Request publica colecciones, carpetas, requests y ejemplos, con snippets. Realtime publica
conexiones y eventos con su payload de ejemplo y su esquema si lo hay. No es una diferencia de
producto: el payload lleva lo que el workspace tiene.

## Criterios de entrada

- `apps/viewer`: raíz nueva. Nace con dos destinos reales, archivo y Pages. Sin ella no hay lector
  fuera de Mandor.
- `vite-plugin-singlefile` y `highlight.js`: solo en `apps/viewer`.
- Ningún paquete nuevo: el formato entra en `interop-formats`, el diálogo en `exchange`, el recurso
  en `schema`, `store-fs`, `ipc` y `host`.
- `apps/viewer` se registra en las herramientas que enumeran apps (turbo, depcruise, knip, globs de
  test, typecheck). Regla de depcruise que asuma que toda app es Electron se ajusta, con el motivo en
  su nombre.

### [ ] Fase 1: Payload docs y su fragmento

**Objetivo.** De un IR y unos docs markdown sale un payload `v1` validado; payload ↔ fragmento ida
y vuelta; ningún secreto sale.

```check
file packages/interop-formats/src/docs/export/docs-payload-of.ts
tested packages/interop-formats/src/docs/export/docs-payload-of.ts
file packages/interop-formats/src/docs/document/docs-fragment.ts
tested packages/interop-formats/src/docs/document/docs-fragment.ts
exports @mandor/interop-formats docsPayloadOf
exports @mandor/interop-formats docsPayloadSchema
matches packages/interop-formats/src/docs /deflate-raw/
```

**Cambios.**

- Esquema zod del payload v1: título, intro, docs, colecciones (árbol de carpetas, requests y
  eventos, con descripción y ejemplos), conexiones, entornos (secreta = nombre sin valor), snippets
  ya armados por request, lenguaje y entorno, descargas opcionales.
- Builder IR + docs + snippets hechos → payload. Solo lo elegido. Secreto sale `{{nombre}}`. No
  genera código: lo recibe.
- Fragmento: `deflate-raw` + base64url nativos, prefijo `v1.`. Decodificador elegido por versión en
  una tabla, nunca `switch`. Umbral de enlace largo como constante exportada. URL base del lector:
  constante única, aquí.
- Tests node: centinela de secreto en entorno, header y auth no aparece ni en payload ni en
  fragmento; ida y vuelta exacta; versión desconocida y payload inválido dan error tipado, sin
  lanzar crudo. Paquete puro: cobertura 100 %.

**No hacer.** HTML, lector, IPC.

**Cierre.** `npm run ci:test -- packages/interop-formats/tests/docs`, luego
`npm run ci:check -- packages/interop-formats`.

### [ ] Fase 2: Publicación guardada

**Objetivo.** Un workspace guarda, lista, renombra y borra publicaciones en disco, y main arma su
payload desde el disco actual.

```check
exports @mandor/schema publicationSchema
file packages/store-fs/src/publication
exports @mandor/store-fs writePublication
file packages/ipc/src/publication
file packages/host/src/publication/publication.handlers.ts
tested packages/host/src/publication/publication.handlers.ts
```

**Cambios.**

- Esquema `publication` en `schema`: ids elegidos, título, intro, lenguajes, entornos.
- Disco en `store-fs`, carpeta de entidad `publication/`: YAML con `yaml` (los comentarios viven),
  escritura atómica como el resto, slug único por workspace.
- Canales en `ipc`, zod en los dos bordes: listar, guardar, borrar, armar payload.
- Handlers en `host`: leen el workspace por el mismo camino que el export (`workspace-data-of.ts` →
  IR), piden los snippets a la función que pasó la app y llaman al builder `docs` que la app pasó.
  `host` no importa `interop-formats`. Ids que ya no existen se ignoran.
- Las dos apps pasan `docs` y registran los handlers en el mismo PR. Request pasa además su función
  de snippets, armada sobre el `codegen/` de su main; Realtime no pasa ninguna.
- Tests: `store-fs` con disco temporal real; handlers con origen temporal; centinela de secreto otra
  vez, ahora desde disco y con el secreto guardado en el doble de `safeStorage`.

**No hacer.** UI, archivo HTML, enlace.

**Cierre.** `npm run ci:test -- packages/store-fs/tests/publication packages/host/tests/publication`,
luego `npm run ci:check -- packages/schema packages/store-fs packages/ipc packages/host`.

### [ ] Fase 3: Lector web

**Objetivo.** `apps/viewer` pinta un payload, venga de `<script>` embebido o del fragmento, y su
build sale en un solo `index.html` con CSP.

```check
file apps/viewer/package.json
file apps/viewer/index.html
matches apps/viewer/index.html /Content-Security-Policy/
contains apps/viewer/package.json "vite-plugin-singlefile"
matches apps/viewer/src /docsPayloadSchema/
```

**Cambios.**

- App Vite + React 19, sin Electron. Arranque: lee el payload (script embebido primero, si no el
  fragmento), valida con `docsPayloadSchema`, monta el lector.
- Lector denso de escritorio, no landing. Skill `ui-design`, tokens y hojas de `@mandor/ui`.
  Lateral con docs, colecciones y conexiones; columna de lectura con método, URL, params, headers,
  auth (tipo y `{{var}}`), body, descripción y ejemplos; panel de snippet con selector de lenguaje;
  buscador; selector de entorno; claro y oscuro según `prefers-color-scheme`.
- Markdown con `Markdown` de `@mandor/ui`. Enlaces filtrados por protocolo. Si el barril de `ui`
  arrastra Monaco al build, `ui` declara `sideEffects` (sus hojas y el arranque del editor) en vez de
  abrir una subruta; el presupuesto de peso lo destapa.
- Snippets: el lector pinta los que trae el payload. No importa `codegen`.
- Resaltado con `highlight.js` (núcleo y lenguajes de `codegen`, más JSON); colores desde tokens.
- Build con `vite-plugin-singlefile`. Un plugin pequeño de la app calcula el hash del script y lo
  escribe en la CSP. Presupuesto de peso que rompe el build: la cifra la fija esta fase al medir, con
  su motivo escrito.
- Registrar la app en las herramientas que enumeran apps.
- Tests dom: pinta request y evento; `<script>` dentro de markdown ni corre ni aparece como HTML;
  ningún `href` queda en `javascript:`; secreto se pinta `{{nombre}}`; payload inválido da página de
  error legible, sin lanzar.

**No hacer.** Workflow de Pages. Escribir el archivo desde la app.

**Cierre.** `npm run ci:test -- apps/viewer/tests`, `npm run ci:check -- apps/viewer`, luego
`npm run ci:verify` (una app nueva toca herramientas). Abrir el `index.html` construido con un
payload de prueba en el fragmento: claro y oscuro.

### [ ] Fase 4: Archivo, enlace y Pages

**Objetivo.** Desde main, una publicación sale como `.html` en disco, como vista previa en el
navegador y como enlace que abre en Pages.

```check
file packages/host/src/publication/publication-html.ts
tested packages/host/src/publication/publication-html.ts
contains apps/sync/package.json "@mandor/viewer"
contains apps/async/package.json "@mandor/viewer"
file .github/workflows/pages.yml
contains .github/workflows/pages.yml "deploy-pages"
contains .github/workflows/pages.yml "timeout-minutes"
```

**Cambios.**

- Plantilla del lector como recurso de las dos apps: turbo construye el lector antes; las apps lo
  declaran en `devDependencies` (llega como recurso, no al `node_modules` del instalador) y le dicen
  a `host` dónde queda, en desarrollo y empaquetada.
- `host` escribe el HTML: plantilla + payload en `<script type="application/json">`, con
  `</script>` escapado; descargas generadas con los formatos de export que la app le pasó.
- Guardar con el diálogo del sistema que usa el export. Vista previa: archivo temporal +
  `shell.openPath`.
- Enlace: URL base + `#` + fragmento de la fase 1. Main lo arma; la ventana lo copia.
- Workflow `pages.yml`: build del lector y deploy en push a `main` que toque el lector o lo que
  importa. `timeout-minutes`, permisos mínimos (`pages: write`, `id-token: write`).
- Puerta externa, una vez y a mano: el dueño activa Pages con fuente «GitHub Actions».
- Tests: HTML escrito trae payload, CSP y ninguna URL externa; `</script>` en una descripción no
  corta el script; el enlace decodifica al mismo payload.

**No hacer.** UI del diálogo.

**Cierre.** `npm run ci:test -- packages/host/tests/publication`, luego
`npm run ci:check -- packages/host apps/async apps/sync`. Tras el merge: Pages responde y un enlace
de prueba abre.

### [ ] Fase 5: Diálogo Publicar en las dos apps

**Objetivo.** En Realtime y en Request, el usuario crea, edita y borra publicaciones, y saca archivo
o enlace.

```check
exports @mandor/exchange PublishDialogAction
exports @mandor/exchange PublishCollectionItem
file packages/exchange/src/publish/components/dialog/PublishDialog.tsx
tested packages/exchange/src/publish/components/dialog/PublishDialog.tsx
contains apps/sync/src/renderer/app/SyncPublishAction.tsx "PublishDialogAction"
contains apps/async/src/renderer/app/AsyncPublishAction.tsx "PublishDialogAction"
```

**Cambios.**

- Diálogo en `exchange/publish/`: publicaciones del workspace y «Nueva»; nombre, título, intro (con
  el editor markdown que ya existe), árbol de `choice/` reusado, lenguajes de snippet, entornos a
  incluir con nota de que los secretos van sin valor. Guarda al cambiar.
- Pie: «Vista previa», «Guardar HTML…» y «Copiar enlace» (acción primaria). Largo del enlace en
  vivo al cambiar lenguajes y entornos. Enlace largo: nota bajo el pie, no bloquea.
- Puertas: «Publicar…» en el menú de colección (preselecciona) y comando de paleta. Las dos apps las
  registran en el mismo PR, igual que el export.
- Textos es y en, sin vocabulario de git ni rutas: «publicación», «archivo», «enlace».
- Diseño con la skill `ui-design`, en el mismo marco que el diálogo de export.
- Tests de contrato con el doble del puente: crear, renombrar, borrar, elegir, copiar enlace. e2e en
  las dos apps: publicación de una colección → «Guardar HTML» → el archivo existe y trae el nombre
  del request o del evento.
- README (es y en): sección corta «Compartir documentación».

**No hacer.** Lector dentro de la app. Publicación en CI.

**Cierre.** `npm run ci:test -- packages/exchange/tests/publish`, luego
`npm run ci:check -- packages/exchange packages/i18n apps/async apps/sync` y `npm run ci:local`. Con
cada app abierta: crear una publicación, vista previa, copiar el enlace y abrirlo, guardar el HTML y
abrirlo sin red.

## Deudas

Ninguna todavía.
