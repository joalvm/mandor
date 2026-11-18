# Revisión de Mandor — guía para agentes

Para revisar código de `packages/`, `apps/` y `tools/` en busca de fallos, errores posibles, mala
optimización y código que rompe el estándar del repo. Sirve igual para un diff que para una
**pasada** entera. Qué hay construido y qué límites están decididos: [specs/mandor.md](specs/mandor.md).
Gates, fronteras, lint y tests: `CONTRIBUTING.md`. Cómo se escribe cada cosa: `skills/`.

Vara: dos apps de escritorio livianas, seguras y rápidas, con código que una empresa grande
firmaría. Memoria, seguridad y rendimiento pesan igual. **Crecer con el uso es un bug**, aunque
sean KB.

## Ciclo de un hallazgo

Un **hallazgo** es un defecto con síntoma medido o reproducido. Uno a la vez.

1. **Sondear.** Una zona, todas las clases de «Qué buscar». Leer por rangos; para estructura, el
   grafo de código antes que abrir archivos. Termina con una hipótesis concreta («X crece por cada
   Y», «Z no corta en la fase W») o con la zona recorrida sin hallazgo.
2. **Medir o reproducir.** Números: ms, MB, nodos DOM, listeners, procesos vivos. Sondas de un
   uso fuera del repo. Termina con el síntoma escrito con su número. Sin número es una sospecha:
   se reporta como tal y no se arregla.
3. **Rojo.** El test más barato que alcanza el defecto (skill `testing`): `npm run ci:test --
<ruta>`. Termina cuando se vio **rojo por este defecto**. Un test que pasa sin el arreglo no
   prueba nada: se endurece.
4. **Arreglo.** Causa raíz, con la pieza del estándar si existe (tabla de abajo). Si cambia el
   producto (un límite, qué se descarta, qué ve el usuario), se pregunta antes.
5. **Verde.** El mismo test y los vecinos del paquete. `npx prettier --write`, `npx eslint` y
   `npx tsc -p <paquete> --noEmit` sobre lo tocado.
6. **Commit.** Un hallazgo, un commit, con causa, síntoma medido y qué cambia.
7. **Bloque.** Cada ~10 commits: `npm run ci:verify`, y `npm run ci:e2e` si se tocó algo que corre
   en la app, una dependencia o Electron. Un `ci:*` a la vez; el resultado real es la línea
   `Local CI reports … (exit N)` del log.

Lo que queda sin arreglar va a [specs/pendiente.md](specs/pendiente.md) §3, con su peso.

Una **pasada** recorre cada paquete de `packages/`, los tres procesos de cada app (`main`,
`preload`, `renderer`) y `tools/`, cada uno contra las siete clases. Termina cuando una pasada
entera no deja hallazgos. El informe lista zona por zona: hallazgos, sospechas y «sin hallazgo».

## Qué buscar

### Memoria

- Mapa, Set, caché o cola sin tope, o que nadie vacía al cerrar la pestaña, dejar el origen o
  terminar la conexión. Para cada uno: **¿qué lo vacía?**
- Retención hasta un timeout: `AbortSignal.timeout` con listener, timer sin `clearTimeout` en el
  `finally`.
- Copia entera de un dato grande: `Buffer.from(bytes)`, `TextEncoder.encode` para medir,
  `JSON.stringify` para comparar, respuesta IPC copiada sin necesidad.
- DOM sin ventana: lista o tabla que pinta todas sus filas.
- Código en el chunk de entrada que el arranque no usa.
- Vigía recursivo sobre `.git` o `.mandor`.

### Seguridad

Solo dos responsabilidades: un valor marcado secreto nunca llega al remoto, y ninguna ejecución
maliciosa ocurre por culpa de Mandor. La entrada hostil llega del servidor, del repo de otro, del
remoto y del archivo importado.

- Entrada sin tope de tamaño, profundidad, cantidad o tiempo: bombas de compresión, `$ref`, alias
  YAML, variables; ReDoS.
- Trabajo hostil en main o en la ventana sin aislamiento: un cuelgue síncrono en main congela la app.
- Rutas: traversal, enlaces simbólicos, nombres de dispositivo de Windows, `.git` o `.mandor`
  alcanzables desde un body o un import.
- Git: URL leída como opción, `ext::`, `.mandor/` que entra o sale por el remoto.
- Credencial que viaja a otro origen (redirección, agente o Manager reutilizado) o secreto sin
  redactar en log, push, grabación o exportación.
- Inyección en código generado (snippets).
- Ventana: CSP, `setWindowOpenHandler`, `will-navigate`, `openExternal` solo `https:` y `mailto:`,
  iframe `sandbox=""`, IPC solo del marco superior y con zod en los dos bordes.
- Scripts: escape del sandbox, tope saltado, envío a un host que el item no nombra, script ajeno
  que corre sin aprobar.

### Rendimiento

- Trabajo cuadrático o repetido: `includes` o `splice` en bucle, parsear o formatear el dato
  entero por tecla o por pintada, unir y reescribir por tramos.
- Ventana congelada por trabajo síncrono grande: formatear, parsear, diff, volcado hex.
- Aborto que no corta: cancelar o timeout en DNS, TCP, TLS o túnel de proxy; espera sin plazo.
- `Promise.all` sobre una carpeta: EMFILE con `ulimit -n 256`.
- Arranque: presupuestos en `apps/*/tests/e2e/support/budgets.ts`. Request arranca cerca de su techo.

### Robustez y disco

- **Ilegible tratado como falta**: un `catch` que devuelve vacío y después escribe borra datos.
- Escrituras solapadas del mismo archivo; restos a medio escribir que nada barre.
- Archivo roto que bloquea para siempre: los de sesión se leen tolerantes.
- Carrera en la ventana: se pinta solo la última lectura pedida y se descarta la de otro origen.
- Proceso muerto a mitad, disco lleno, red muda: la app sigue y no pierde datos.

### Arquitectura y estándar

- Capa: sale del manifiesto (`react` → dom, `electron` → plataforma, ninguno → puro). Dependencia
  nueva que cambia la capa de un paquete es hallazgo.
- Frontera: reglas de `.dependency-cruiser.cjs`. Un `if` sobre el tipo de app dentro de
  `packages/` va a `apps/<app>/src/renderer/features/`.
- Dos apps: lo compartido se registra en las dos en el mismo PR; lo que vive en una tiene fila en
  la tabla de diferencias de `mandor.md`. Preguntar por cada pieza: ¿compartida o especializada?
- Nombre exportado por dos módulos: algo que no subió, o dos cosas con un nombre. Los aceptados
  están en `mandor.md` §Repetidos a propósito.
- **Mismo problema resuelto dos veces**: si la tabla de abajo ya tiene la pieza, se usa.
- Peso muerto: archivo, export, dependencia, generado o herramienta que nadie consume (knip,
  jscpd). Se borra.
- Forma de un paquete: `src/index.ts` único barril, `tests/` espejo de `src/`, todo archivo de
  `src` nombrado por un test.

### Código

Skills `code-style`, `react-components`, `architecture`. Lo que más se repite:

- Elegir por clave con tabla tipada, no con `switch` ni serie de `if`.
- Componentes en árbol: contenedor y partes como hijos; la rama de JSX en un componente satélite
  con retorno temprano.
- El archivo de componente solo tiene el componente; hooks y funciones salen.
- Nombres llanos, sin jerga de patrones ni capas envoltorio.
- Excepciones (`eslint-disable`, `any`, `as unknown as`, `// *-policy:`): cada una con motivo
  escrito y todavía cierto. Una sin motivo vigente es hallazgo.
- Interfaz: ningún texto pinta ruta, segmento ni id; ninguno usa vocabulario de git; nada bloquea
  al usuario (sin botón deshabilitado ni campo en rojo por un valor «incorrecto»).

### Tests

- Un test que no puede fallar: ver su rojo.
- Espera por condición, nunca por reloj.
- Recurso real antes que mock; doble que implementa el contrato.
- Rigor antes que velocidad: se acelera con fixtures compartidos, nunca recortando casos ni carga.
- `maxRetries` o timeout subido que tapa una fuga.

## El estándar: una pieza por problema

| Problema                                   | Pieza                                                               | Dónde                    |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------ |
| Escribir un archivo                        | `atomicWrite`, por turno con `inTurn(clave, trabajo)`               | `store-fs`               |
| Renombrar en Windows                       | `renameWithRetry`                                                   | `store-fs`               |
| Leer muchos archivos                       | `readFileText` (32 a la vez, tope 64 MiB)                           | `store-fs`               |
| Id nuevo                                   | `newId()`, solo en main o en una importación                        | `schema`                 |
| Segmento de ruta que viene de fuera        | `assertSegment`                                                     | `schema`                 |
| Host de una URL con variables              | `assertSafeAuthority`                                               | `vars`                   |
| Scope de variables de un envío             | `variableScopeOf`                                                   | `host`                   |
| Secreto que cruza a ventana, log o archivo | `redactMessage`                                                     | `host`                   |
| Red de un envío (proxy, TLS)               | `networkFor`; token OAuth por `fetchThrough`                        | `host`                   |
| Handler de IPC                             | `HandlerIpc`, `activeRoot`, `failureOf`, `pushToWindow`             | `host`                   |
| Entrada hostil pesada                      | worker con `WORKER_LIMITS`                                          | `host`                   |
| Promesa sin esperar en la ventana          | `fireAndForget`                                                     | `shell`                  |
| Store de la ventana                        | `scopeToOrigin(…)`                                                  | `shell`                  |
| Lista o tabla larga                        | `useRowWindow`, `Tree`, `KeyValueTable`                             | `ui`                     |
| Editor de texto                            | `CodeEditor`; modelos con `retainModel` / `releaseModel`            | `ui`                     |
| Trabajo caro por tecla                     | `useSettledValue` (pausa de 300 ms)                                 | `ui`                     |
| Módulo pesado que el arranque no usa       | `import()` al primer uso (`withSchemaChecker`, `withSchemaToValue`) | `validate`               |
| Fila de ajustes, acción de barra           | `SettingRow` + `Switch`; `IconButton` con tooltip                   | `ui`                     |
| Ráfaga de marcos                           | `ActivityBatcher` y `windowTail`                                    | `transport-async`, Async |

Pieza que falta en la tabla y ya tiene dos usos: se añade su fila en el mismo cambio.

## Lo que no es hallazgo

- Un límite de `mandor.md` §Límites vigentes. Está decidido.
- Un token literal en cabecera, URL o body que sincroniza: es texto del usuario.
- La falta de un aviso o un bloqueo «porque sería más seguro».
- Una diferencia entre apps con fila en la tabla de diferencias.
- Un nombre repetido con fila en §Repetidos a propósito.
- Un residual de `pendiente.md` §3, salvo que haya crecido.

## Cómo se reporta

Por hallazgo: `archivo:línea`, clase, síntoma con su número, entrada concreta que lo dispara,
causa, arreglo propuesto con la pieza del estándar. Ordenados por daño. Una sospecha sin medir va
aparte y dice qué medición la confirma.

## Medir

- Arranque, memoria en reposo y bajo carga: e2e `startup-budget`, `release-memory`,
  `workload-memory` (2000 envíos), `typing-budget`, `script-memory`. El valor sale en la anotación
  `measured`; el heap de main en `mainHeapUsedMb`.
- Localizar una retención: diff de `v8.writeHeapSnapshot` desde `app.evaluate`, antes y después.
- Bundle: un config fuera del repo que envuelve `appBuildConfig` de
  `tools/workspace/app-build-config.mjs` y añade un plugin con `generateBundle` que suma
  `renderedLength` por módulo de los chunks `isEntry`.
- Flags de V8: en las ventanas por `appendSwitch`. `v8.setFlagsFromString` en main aborta la app
  al crear el siguiente worker; lint lo prohíbe.

Referencia (Docker Linux, 2026-10-31): arranque Realtime ~580 ms, Request ~930 ms (techo 1000).
Heap de main al arrancar 8,4 MB y 12,2 MB (techos 11 y 15). Entrada del renderer 1,74 MB y
1,80 MB minificada. `verify` completo ~20 min.
