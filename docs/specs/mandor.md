# Mandor — estado actual

Fecha: 2026-11-23. Hitos H1 a H11 cerrados.

Única spec de lo construido. Dice qué hay y por qué es así. Paquetes, gates, fronteras, lint y
tests viven en `CONTRIBUTING.md` y aquí no se repiten. Lo que falta: [pendiente.md](pendiente.md).
Cómo se revisa: [../revision.md](../revision.md). Si esta página choca con el código, gana el
código y se corrige la página.

## Producto

Dos apps de escritorio, una base de código. Mandor Realtime (`apps/async`) para conexiones que
quedan abiertas; Mandor Request (`apps/sync`) para peticiones con respuesta.

Lo que no cambia nunca:

- Local primero. Un origen conectado es opcional y `Local` no se borra. **Trinquete**: nada que
  hoy funciona en local pasa a exigir remoto.
- El usuario nunca ve git: ni la palabra, ni una ruta, ni un botón de push. Ve **orígenes**.
- Sin cuenta, sin backend propio, sin telemetría (ni anónima, ni de errores, ni opt-out).
- Dos instaladores con versiones independientes: `async-vX.Y.Z`, `sync-vX.Y.Z`.
- Solo `apps/*` elige app.
- Dos responsabilidades y nada más: un valor que el usuario marcó secreto en una variable de
  entorno nunca llega al remoto, y ninguna ejecución maliciosa ocurre por culpa de Mandor. Lo
  demás es decisión del usuario: nada bloquea, nada regaña. Vara: lo que Postman, Bruno e
  Insomnia dejan pasar, pasa.

## Hitos cerrados

| Hito                                | Dejó                                                                                                                                                                                                                    | Lo prueba (e2e)                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| H1 Rebanada vertical                | WebSocket de punta a punta: abrir, enviar, leer, guardar en disco                                                                                                                                                       | `realtime-road`                                                                                                            |
| H2 Workbench                        | Rejilla de grupos, pestañas de cualquier tipo, lateral, paleta, sesión restaurada                                                                                                                                       | `workbench-path`, `group-layout`, `chrome-shape`                                                                           |
| H3 Colecciones, entornos, variables | Árbol de colecciones, entornos, `{{var}}`, secretos                                                                                                                                                                     | `collection-path`, `environment-connection`, `globals`                                                                     |
| H4 Async completo                   | Socket.IO v2 a v4 con acks, AsyncAPI entra y sale, reconexión, grabación, schema por mensaje                                                                                                                            | `socketio-path`, `asyncapi-*`, `reconnect-path`, `schema-editor`                                                           |
| H5 Sync (absorbió H6)               | HTTP, GraphQL, OpenAPI, Postman, HAR, curl, snippets, historial, cookies, OAuth; instaladores con fuses                                                                                                                 | `request-road`, `request-send`, `graphql`, `import-*`, `har`, `curl-and-snippets`, `history`, `oauth-and-cookies`          |
| H7 Orígenes y conflictos            | Orígenes conectados, sincronización, merge de tres vías, pestaña de conflicto                                                                                                                                           | `two-machines-one-origin`                                                                                                  |
| H8 Robustez                         | Memoria plana, entrada hostil topada, arranque con presupuesto, updater por canales beta y estable, respuesta validada por esquema                                                                                      | `startup-budget`, `release-memory`, `workload-memory`, `typing-budget`, `faults`, `unreadable-file`; workflow `update-e2e` |
| H9 Colecciones completas            | Colección y carpeta guardan docs, variables, auth y cabeceras; globales pasan al origen; una carpeta entra y sale sola                                                                                                  | `folder-exchange`, `folder-variables`, `folder-settings`, `folder-auth-headers`                                            |
| H10 Scripts                         | Scripts en sandbox antes y después de cada envío, aprobados por máquina                                                                                                                                                 | `scripts`, `script-attacks`, `script-memory`, `installed-smoke`                                                            |
| H11 Nombre, marco y scripts         | El producto se llama Mandor; la ventana es un marco con tres tarjetas, superposiciones sólidas y el ui-lab al día; scripts con `mandor.`, editor con tipos y contexto, bombilla que convierte Postman, Insomnia y Bruno | `chrome-shape`, `script-editor`                                                                                            |

Entre hitos, sin número: ejemplos de respuesta en Request (`request-examples`), ids opacos en
disco, intercambio de workspace con Insomnia y Bruno (`workspace-exchange`), tabla clave-valor
ventaneada (`long-environment`).

## Diferencias entre apps

**Sin fila aquí, es compartido** y se registra en las dos apps en el mismo PR. Lo que queda en una
sola app cita su fila en el PR. Fila nueva = decisión nueva, con motivo.

| Eje                       | Realtime (async)                                                    | Request (sync)                                                                  |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Unidad de trabajo         | conexión: sesión larga con estado                                   | request: transacción sin estado                                                 |
| Pestaña                   | la conexión **es** la pestaña; no se cierra viva                    | el request se abre y se cierra libre                                            |
| Dueño del estado          | `main`: el socket vive fuera del renderer                           | efímero; solo el historial persiste                                             |
| Iniciativa                | ambos lados hablan cuando quieren                                   | solo el cliente inicia                                                          |
| Correlación               | no existe por defecto; hay que fabricarla                           | intrínseca: la respuesta es de su request                                       |
| Item de colección         | mensaje sin destino; lo pone la conexión activa                     | request con destino propio                                                      |
| `{{var}}` resuelve contra | entorno de la conexión                                              | entorno del workspace                                                           |
| Cancelar                  | desconectar, y se decide si reconecta                               | abortar; no hay nada que reconectar                                             |
| Fin de la operación       | no hay: ventana de espera y timeout                                 | la respuesta, o el timeout                                                      |
| Volumen                   | miles de mensajes por sesión; búfer acotado                         | decenas de entradas, cada una completa                                          |
| Reintento                 | reconexión con backoff, política de sesión                          | reintento de petición                                                           |
| Documento estándar        | AsyncAPI                                                            | OpenAPI                                                                         |
| Panel al lado del item    | actividad: lista, filtros y detalle del marco                       | respuesta: body, cabeceras, cookies, tiempos; el historial es superficie aparte |
| Vista previa de pestaña   | nunca: abre mantenida                                               | un clic abre en vista previa                                                    |
| Pestaña suelta            | no hay                                                              | request suelto con «Guardar en…» y pegado de curl                               |
| Ejemplos de respuesta     | no hay: un flujo no tiene una respuesta                             | hijos del request en el lateral, con pestaña propia                             |
| Intercambio de colección  | AsyncAPI entra y sale                                               | OpenAPI, Postman y HAR entran; OpenAPI y Postman salen                          |
| Intercambio de workspace  | Mandor, Insomnia, Bruno, con conexiones WebSocket; Postman no entra | Mandor, Postman, Insomnia, Bruno, con requests HTTP                             |
| Ajustes de carpeta        | docs y variables; auth y cabeceras viven en la conexión             | docs, variables, auth y cabeceras, heredadas por los requests                   |
| Scripts                   | a nivel conexión, tres eventos; salen como línea de la actividad    | colección, carpeta y request, dos eventos; salen en Tests y Consola             |
| Snippets de código        | no hay                                                              | `@mandor/codegen`                                                               |

Tres trampas que no se unifican: el ack de Socket.IO es un par enlazado en la actividad, no un
request; la suscripción GraphQL es transporte de Realtime; gRPC, cuando entre, entra en Realtime
aunque sea unary.

## Disco

Un repo por app (`Mandor/async/local/`, `Mandor/sync/local/`). Un item, un archivo YAML; docs en
Markdown con `title` en front matter.

```
mandor.yaml
workspaces/<id>/
  workspace.yaml
  environments/<id>.yaml
  connections/<id>.yaml            solo Realtime
  collections/collections.yaml     orden
  collections/<id>/collection.yaml
  collections/<id>/<id>.yaml       item
  collections/<id>/<id>/folder.yaml
  docs/<id>.md
.mandor/                           privado: historial, cookies, sesión, referencias de secretos
```

- **Ids opacos**: `newId()` de `@mandor/schema`, 12 caracteres, acuñado solo por main y por una
  importación. Renombrar reescribe `name` o `title`; el archivo no se mueve. La interfaz nunca
  pinta ruta, segmento ni id.
- Escritura atómica (temporal + rename), por turnos por archivo, con vigía que recarga lo escrito
  por fuera. Lectura con `yaml` de eemeli: conserva comentarios.
- `.mandor/` se ignora desde el `git init`, nunca entra a un commit y, si llega de un remoto, se
  aparta y se restauran los locales.

## Variables, secretos y auth

- Precedencia, del más fuerte al más débil: `script › carpeta (la más honda primero) › entorno
activo › colección › globales del origen › dinámicas`. No hay variables de workspace.
- Una variable sin definir queda como texto literal. Presupuesto por resolución (profundidad 10,
  100 000 expansiones, 16 MiB); lo que sobra queda literal.
- Secreto = variable de entorno marcada. Valor en `safeStorage`, referencia en `.mandor/`, cadena
  vacía en el YAML. Todo lo que cruza a la ventana, al log, a la grabación o a una exportación
  pasa por la redacción. Un token escrito a mano en una cabecera es texto normal y sincroniza.
- Auth: mismos esquemas en las dos apps; cambia dónde se aplican (conexión en Realtime; request,
  carpeta o colección en Request). OAuth con PKCE por loopback y client credentials, por la misma
  red que los envíos.

## Orígenes

Origen = repo git que el usuario no ve. Sincronizar trae, fusiona en tres vías por valor
(`@mandor/merge`) y envía. Lo que no fusiona solo abre una pestaña de conflicto con una pregunta
por diferencia. Nunca `push --force`. URL de origen: `https:`, `ssh:`, `file:` o forma scp, sin
host ni usuario que empiece con guion.

## Scripts

Diseño público en `SCRIPTS.md` y `SECURITY.md`. Lo esencial:

- QuickJS (WASM) en un `worker_threads`; el broker vive en main. Nunca `vm` ni `eval`.
- Aprobación por máquina: `sha256(origen, workspace, nivel, evento, texto)` en `userData`. Un
  script que llega de otro (sincronización, importación) no corre hasta aprobarlo aquí.
- Regla de destino: un script no manda a un host que el item no nombra.
- Topes en `SCRIPT_LIMITS`: 5 s por script, 30 s y 32 scripts por cadena, 64 MiB, 8 workers,
  10 `sendRequest` por corrida.
- API `mandor.`: `variables`, `request`, `response`, `test`, `expect`, `sendRequest`; en Realtime,
  `socket` y `message`. Lo que un momento no muestra no existe en sus tipos.
- `mandor.response.to`: las aserciones de respuesta del chai de Postman, con sus mismos mensajes
  (`status`, `header`, `body`, `jsonBody`, `jsonSchema`, `be.success`, `be.notFound`, `be.json`…).
  `responseTime` y `responseSize` (bytes de cada línea de header más los del body) afirman el
  número si se llaman, y leídas siguen sobre él: `responseTime.below(500)`. `jsonSchema` lo
  comprueba el worker con `@mandor/validate`, que solo se carga si el script nombra `jsonSchema`.
  La bombilla escribe `pm.response.to…` en `mandor.` si cada palabra existe; otra queda marcada.
- Editor: los tipos de su momento con la ayuda en el idioma de la ventana, más su contexto
  (variables, headers y una muestra de la respuesta) en la completación y el texto gris.
- Importar de Postman, Insomnia o Bruno deja cada script en su momento, tal como vino, sin
  aprobar; los tests de Bruno se suman al script de después de la respuesta. Exportar los escribe
  tal cual.
- Lo de otra app se subraya con su nombre; la bombilla lo escribe en `mandor.` (la línea o el
  script entero) con las tablas de `script/src/dialects/`. Nunca al importar, guardar ni exportar.
- Fuera de v1: runner, `setNextRequest`, datasets, visualizador, módulos, variables de script
  persistidas, scripts de workspace, scripts por mensaje en Realtime.

## Límites vigentes

Decididos por el usuario. No se reabren; lo que choque con uno se pregunta.

| Límite                                  | Valor                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Import en worker                        | 60 s, 1024 MB                                                                                                      |
| `readFileText`                          | rechaza más de 64 MiB                                                                                              |
| Archivos abiertos a la vez              | 32                                                                                                                 |
| Respuesta de Request por defecto        | 50 MiB                                                                                                             |
| Formatear y colorear un body o un marco | hasta 5 MiB                                                                                                        |
| Volcado hex                             | primer 1 MiB, con aviso                                                                                            |
| Historial de Request                    | 500 entradas, 30 días, 1 GiB de bodies por workspace; inline hasta 64 KiB                                          |
| Cookies                                 | 180 por dominio, 3300 por jar, 4096 B por cookie                                                                   |
| Actividad de Realtime en ventana        | 500 entradas, 2 MiB                                                                                                |
| Grabación de Realtime                   | cola de 64 MiB; pasado, descarta y escribe una línea de hueco                                                      |
| Socket.IO por polling                   | 16 MiB                                                                                                             |
| Reconexión                              | 500 ms a 8 s, 5 intentos, cuenta a cero tras 5 s abierta                                                           |
| `content-encoding` apilados             | 5                                                                                                                  |
| Respuesta de token OAuth                | 1 MiB                                                                                                              |
| ReDoS en `pattern`                      | motor lineal de V8 en las ventanas; patrón que no acepta queda fuera y el veredicto lo dice. Main sin motor lineal |
| Cabeceras sensibles en historial        | en claro, como Postman                                                                                             |
| Borrar workspace                        | borra su historial y sus bodies                                                                                    |

## Repetidos a propósito

`npm run depcruise` avisa de nombres que exporta más de un módulo. Estos se quedan. Un nombre
nuevo en el aviso pide una fila aquí o un nombre distinto.

| Nombre                                                                              | Dónde                                                                | Motivo                                                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createConnection`, `createWorkspace`, `deleteConnection`, `createDoc`, `renameDoc` | `schema`, `store-fs`, features                                       | Mismo verbo en capas distintas: `schema` arma, `store-fs` escribe, la feature lo pide por el bridge |
| `initRepo`                                                                          | `git`, `store-fs`                                                    | `git` crea o adopta; `store-fs` escribe el esqueleto encima                                         |
| `addOrigin`, `checkOrigin`, `listOrigins`, `removeOrigin`, `renameOrigin`           | `host`, `repos`                                                      | Los dos lados de la misma llamada al bridge                                                         |
| `retryConnectionNow`, `openSocket`, `OpenTarget`                                    | `transport-async`, Async                                             | El transporte actúa; la app lo pide por el bridge                                                   |
| `ActivityRecord`                                                                    | `ipc`, `transport-async`                                             | Espejo: el transporte no importa contratos; lo fija `ws-activity.test-d.ts`                         |
| `HttpResponse`, `SyncResponse`                                                      | `schema`, `transport-sync`                                           | Espejo: `transport-stays-a-leaf`                                                                    |
| `SocketIoVersion`, `tlsOptionsOf`                                                   | `schema`, transportes                                                | Los transportes son hojas y cada uno escribe la forma que habla                                     |
| `isRecord`                                                                          | `graphql`, `interop-core`, `validate`                                | `validate` y `graphql` no dependen de ningún `@mandor/*`                                            |
| `IconName`                                                                          | `icons`, `ui`                                                        | Reexportación, una definición                                                                       |
| `ImportPlan`, `ImportPlanEntry`, `InteropReport`                                    | `interop-core`, `ipc`                                                | Reexportación del contrato, una definición                                                          |
| `conflictId`, `ConflictRead`                                                        | `merge`, `store-fs`, `repos`                                         | Tres alturas del mismo choque: archivo, pregunta, pestaña                                           |
| lectores `xOf` (`authOf`, `schemaOf`, `rowsOf`, `textOf`…)                          | formatos, `interop-core`, `codegen`, `graphql`, `validate`, features | Internos a su archivo: cada uno lee su propia forma                                                 |
| `collectionSchema`, `environmentSchema`, `variableSchema`, `FOLDER_FILE`            | `interop-formats` (Bruno), `schema`, `store-fs`                      | El esquema de Bruno es interno a su formato                                                         |
| `FormRow`, `ClientCredentialsFields`, `ProxySettings`, `ResponseBody`, `BodyWindow` | `ui`, features, `schema`, `ipc`                                      | El componente se llama como el dato que muestra                                                     |

## Licencia y marca

AGPL-3.0-only, con CLA para contribuir. Nombres y logos fuera de la licencia (`TRADEMARKS.md`).
Marca Mandor: `Mandor Realtime` y `Mandor Request`, carpeta de datos `Mandor/`. Acento teal en Realtime y naranja en Request, por `data-accent`. `appId` `com.mandor.async` y
`com.mandor.sync`.

## Diseño

Manda el código: tokens en `packages/ui/src/styles/` (`scales.css` es la verdad de las alturas),
componentes en `packages/ui`, glifos y perfil de dibujo en `packages/icons` y su README. `npm run
design` comprueba marcado y tokens. Estándar de interfaz e iconos: skills `ui-design` e
`iconography`.

- Marco y tarjetas: la ventana es `surface-frame` y cada zona una `Card` (`surface-card`) con hueco
  de 8 y radio de 10. Request y Realtime parten su item en tres tarjetas con nombre (destino,
  request o mensaje, respuesta o actividad); lo que se parte dentro de una tarjeta sigue pegado.
- Pestañas de la rejilla: inactiva sin relleno, activa con `surface-tab-active`, nunca acento.
- Foco sin anillo exterior: `data-focus-frame` recolorea un borde propio de 1 px. Un control se
  rellena (`surface-control`) con borde transparente que el foco recolorea y el error pinta.
- Densidad y animaciones son preferencias de apariencia (`data-density`, `data-motion`). Compacta
  pone hueco y radio a 0; el movimiento reducido quita escala y desplazamiento y conserva el
  fundido.
- Lo que flota es sólido: diálogos de una superficie con radio 12, menús y capas con radio 10, y
  avisos como tarjetas de 380 px apiladas de a tres. Ajustes es una lista, sin cajas.
- El ui-lab se dibuja como las apps y lee el valor de cada token de la página.
