# Mandor — lo que falta

Fecha: 2026-11-13. Lo hecho: [mandor.md](mandor.md). Cada fila se comprobó contra el código ese día;
antes de planear una, se vuelve a comprobar. Al cerrarse, la fila se borra de aquí y lo construido
pasa a `mandor.md`.

## 1. Publicación

Objetivo: que instalarlo no dé miedo. Hoy no hay release: versiones `0.1.0`, README dice «Coming
soon», `electron-builder.yml` sin `publish` ni firma.

| Falta                         | Nota                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Firma de Windows              | Azure Trusted Signing; `publisherName`                                                                                    |
| Firma y notarización de macOS | Puerta externa: cuenta de desarrollador de pago. Sin ella sale sin notarizar y la descarga lo dice; no bloquea el resto   |
| Feed por app y canal          | `publish` en cada `electron-builder.yml`; el updater por canales ya existe y lo prueba `update-e2e`                       |
| Workflow de release           | Por tag `async-vX.Y.Z` / `sync-vX.Y.Z`: construye, firma, publica. Hoy `installers.yml` construye sin publicar            |
| Notas de versión              | No hay CHANGELOG. El squash guarda título y commits: generarlas de ahí                                                    |
| Documentación de usuario      | Solo existen `SCRIPTS.md` y `SECURITY.md`                                                                                 |
| Checklist de release          | Incluye e2e completo en las tres plataformas: un cambio de flags de V8 en main tumbó la app y solo el e2e completo lo vio |
| Comprobar a mano una vez      | Worker de import dentro del asar de un instalador real; vigía del repo en Windows y macOS                                 |

Terminado: instaladores firmados en las tres plataformas, `verify` y e2e verdes en CI, una
actualización beta → estable sobre instalación real.

## 2. Tests que fallan a veces solo en Windows

El repo ya es público y sus minutos de Actions son gratis: se pueden perseguir. Mientras tanto,
un fallo de esta lista se relanza con `gh run rerun <run> --failed`.

| Test                                                       | Síntoma                                                         | Hipótesis                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/async/tests/e2e/reconnect-path.spec.ts`              | tras matar el servidor queda «Disconnected», nunca «Connecting» | main no reintenta (`scheduleRetry` da `skipped` por `userClosed`) o la ventana pierde el estado (`connectionsStore.reset()` tardío) |
| `packages/host/tests/repo/commit-scheduler.test.ts`        | llega un commit de dos                                          | `git` lento en el runner                                                                                                            |
| `packages/host/tests/sync/merge-divergence.test.ts`        | timeout de 30 s                                                 | varios `git` por paso                                                                                                               |
| `packages/host/tests/origin/clone-origin.handlers.test.ts` | `EBUSY` al borrar                                               | un handle abierto (vigía o `git` hijo) en el teardown                                                                               |

Orden: (1) workflow manual `flakes.yml` en `windows-latest` con `--repeat-each` y traza como
artefacto al fallar, hasta ver rojo; (2) arreglar la causa que el rojo señale, con su test de
regresión; (3) quitar los `maxRetries` de `origin-handlers-fixture.ts` y `local-repo-layout.test.ts`:
tapan una fuga, no la arreglan. Nunca subir reintentos ni timeouts para que pase. El techo de
`expect.poll` (10 s) ya está en `vitest.config.ts`.

## 3. Residuales conocidos

Acotados, ninguno crece sin tope. Los **decidir** se preguntan antes de tocar.

| Residual                                                                                                                                                                                                    | Peso  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Decidir**: los secretos de sesión (`rememberSessionSecrets`) crecen con cada renovación OAuth; sube el costo de redactar cada push. Topar arriesga no redactar un token viejo que un socket largo aún usa | medio |
| **Decidir**: los secretos de un entorno borrado siguen cifrados en `userData`                                                                                                                               | bajo  |
| Body huérfano en disco si `recordHistory` falla tras renombrar                                                                                                                                              | bajo  |
| Cancelar antes de conectar: el socket a medio abrir vive hasta su reloj (≤ 10 s)                                                                                                                            | bajo  |
| `CookieJarTable` pinta hasta 3300 filas sin ventana                                                                                                                                                         | bajo  |
| Los jars de cookies no se sueltan al dejar el origen (acotados por `trimJar`)                                                                                                                               | bajo  |
| `folded` / `examplesClosed` no se podan al borrar una carpeta                                                                                                                                               | bajo  |
| El visor de body decodifica todo por cada ventana pedida al hacer scroll (O(n)); pide decodificar en streaming                                                                                              | bajo  |
| dockview retiene el árbol de una pestaña cerrada hasta 500 ms ([dockview#1755](https://github.com/dockview/dockview/issues/1755)); subir cuando salga el arreglo                                            | bajo  |
| TypeScript 7 retenido en `dependabot.yml` hasta que typescript-eslint lo acepte                                                                                                                             | bajo  |

## 4. Documentación pública atrasada

- `packages/README.md`: nombra `collection` (es `collections`) y le faltan `codegen`, `exchange`,
  `graphql`, `transport-sync`, `updates`. Sus tablas de dependencias se escribieron a mano: o se
  generan de los manifiestos o se quitan.
- `README.es.md` y `README.md` dicen «Coming soon»: cambian con el primer release.

## 5. Huecos de producto

Sin plan todavía. Comprobado contra Postman, Bruno, Yaak, Hoppscotch, Insomnia, Apidog y Mockoon
el 2026-11-13; se vuelve a comprobar antes de planear uno. El hueco está en Realtime: ningún
cliente de escritorio trata los sockets como algo que se prueba, solo como algo que se mira.

### Lo que nadie cubre

Ordenado por valor sobre costo.

| Hueco                                                                  | App      | Quién se acerca                                                                  | Por qué ayuda                                                                                                                                                                     |
| ---------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versiones y restaurar de un origen                                     | las dos  | Postman lo tiene en su nube; Bruno y Yaak enseñan git crudo (rama, commit, push) | Debajo hay git y el usuario no ve qué cambió una sincronización ni puede volver atrás. Es la ventaja ya pagada que no se enseña. Sin vocabulario de git: «versiones», «restaurar» |
| Varias conexiones como distintos usuarios en una sola línea de tiempo  | Realtime | Nadie; `wsdirector` lo hace por CLI y sin Socket.IO                              | Salas, presencia y chat se prueban viendo «A envía, B recibe». Hoy son pestañas sueltas                                                                                           |
| Escenario: enviar A, esperar un mensaje que cumple X en N ms, enviar C | Realtime | Postman no corre scripts en WebSocket; Apidog lo anuncia y su FAQ lo niega       | Es la prueba natural de un socket. Los scripts de hoy son de conexión, no de mensaje. Abre runner y CI                                                                            |
| Importar los marcos WebSocket de un HAR                                | Realtime | Nadie. Chrome y Firefox ya los exportan en `_webSocketMessages`                  | Una sesión real del navegador pasa a colección. Barato: el importador de HAR existe                                                                                               |
| Mismo request contra dos entornos, con diff de las respuestas          | Request  | Nadie en los clientes grandes; Yaak guarda historial sin comparar                | «¿Qué cambió entre staging y producción?» se resuelve hoy pegando JSON en otra herramienta                                                                                        |
| Grabar una sesión y servirla como servidor falso local                 | Realtime | Mockoon simula WebSocket sin Socket.IO ni AsyncAPI; Microcks pide contenedores   | El frontend trabaja sin backend, desde lo que el socket ya dijo                                                                                                                   |
| Decodificar marcos binarios (protobuf, msgpack) con su esquema         | Realtime | Apidog decodifica msgpack en bodies HTTP; en marcos, solo crudo                  | Hoy se lee hex y se adivina                                                                                                                                                       |
| Marcar en vivo el marco que viola el AsyncAPI                          | Realtime | Sin comprobar                                                                    | Deriva de contrato a la vista, sin escribir un test                                                                                                                               |
| Reimportar un AsyncAPI sin perder lo editado                           | Realtime | En OpenAPI ya lo hacen Bruno y Apidog; en AsyncAPI, sin comprobar                | `merge` ya une tres versiones; falta enseñar qué quedó viejo                                                                                                                      |

### Lo que otros ya tienen

Paridad, no diferencia. Entra cuando un usuario lo pida.

| Hueco                                       | App      | Nota                                                                                                                                                                          |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnóstico sin telemetría                  | las dos  | `mandor.log` existe y nada en la interfaz lo abre. Falta «Copiar diagnóstico» (versión, sistema, últimas líneas redactadas) y plantilla de issue. Va antes del primer release |
| Runner de colección                         | Request  | Los scripts ya traen `test` y `expect`, de a un request. Abre la CLI para CI                                                                                                  |
| SSE                                         | Realtime | Yaak y Hoppscotch lo tienen. `undici` ya está                                                                                                                                 |
| Suscripciones GraphQL                       | Realtime | `graphql-ws` sobre el WebSocket que ya hay                                                                                                                                    |
| Snippets de conexión                        | Realtime | Request genera código; Realtime no (wscat, cliente JS, Python)                                                                                                                |
| Exportar HAR                                | Request  | HAR entra y no sale; el historial ya tiene los datos                                                                                                                          |
| Reimportar un OpenAPI sin perder lo editado | Request  | Bruno lo tiene con cupo por plan                                                                                                                                              |
| Accesibilidad automática                    | las dos  | `npm run design` comprueba marcado; nada corre axe ni prueba contraste por tema                                                                                               |
| Más idiomas                                 | las dos  | Solo `en` y `es`. `npm run i18n` ya admite más                                                                                                                                |

## 6. Horizonte

Cada uno entra solo cuando cumple su criterio.

| Idea                 | Entra cuando                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ |
| MCP (`mandor-mcp`)   | H11 cerrado y un equipo real usando Mandor a diario                                  |
| CLI para CI          | Existe el runner y alguien pide correr colecciones en CI                             |
| Temas de interfaz    | Uso diario de las dos apps. Uno por PR sobre los tokens de `packages/ui/src/styles/` |
| gRPC                 | El puerto de transporte aguantó dos añadidos. Entra en Realtime                      |
| MQTT, STOMP          | Igual. Uno por PR                                                                    |
| Plugins de terceros  | Existe una segunda implementación real de un transporte                              |
| Colaboración en vivo | Nunca mientras el trinquete siga en pie                                              |

**MCP, lo ya decidido**: proceso Node sin Electron, por stdio; prueba de que el núcleo no depende
del host. Multi repo. Capacidades apagadas por defecto (`--allow-execute`, `--allow-secrets-env`,
`--commit`); sin el flag, la tool no aparece en el listado. Destino de un envío: solo el de un
item que ya existe en el repo. `expectedHash` para no pisar a la app abierta. Nunca hace push,
nunca devuelve un secreto, nunca ejecuta scripts. Paquete `mcp` más binario `apps/mcp`; `mcp` no
importa `host`, `ui`, `shell` ni features.

**Scripts, fuera de v1**: `setNextRequest`, datasets, visualizador, módulos, variables de script
persistidas, scripts de workspace, scripts por mensaje en Realtime.
