# Plan 01 — El producto se llama Mandor y su código vive en un repositorio público

## Contexto

El nombre «Amanda» no se puede registrar en la clase 9 de Niza. El nombre definitivo es **Mandor**:
`Mandor Realtime` y `Mandor Request`. [`pendiente.md`](../../specs/pendiente.md) §1 pone el nombre
de marca primero porque fija `appId`, carpeta de datos, feed de actualización y certificado de
firma; nada de H11 puede empezar antes.

Qué hay hoy:

- El repositorio privado `joalvm/amanda`. Su historial no se publica nunca.
- El repositorio público `joalvm/mandor`, creado con un solo commit: `README.md`, `README.es.md`,
  `LICENSE`, `TRADEMARKS.md`, `.gitattributes` y los dos iconos de app. Su README ya vende el
  producto como Mandor y es el que queda.
- El nombre viejo en unos 3 400 archivos versionados y unas 8 700 apariciones, más 30 rutas que
  lo llevan en el nombre. Dos tercios son el scope `@amanda/*`.
- Ningún release publicado: versiones `0.1.0`, ningún instalador en manos de nadie.

Este plan no enumera archivos. Dice qué formas toma el nombre, qué se decide para cada una y cómo
se comprueba que no quedó ninguna. El inventario se saca del árbol en el momento
(`git grep -il amanda`, `git ls-files | grep -i amanda`), no de este documento.

## Decisiones base

- **Sustitución total, sin alias.** Al terminar, ninguna forma del nombre viejo queda en el árbol:
  ni lector de compatibilidad, ni fallback, ni comentario «antes Amanda». Motivo: nunca hubo
  release, así que no existe en ningún disco ajeno un `amanda.yaml`, una carpeta `.amanda/`, una
  carpeta de datos `Amanda/` ni un `com.amanda.*` instalado que haya que seguir leyendo. Código de
  migración para usuarios que no existen es peso muerto.
- **Mismo largo, mismas mayúsculas.** `amanda` → `mandor`, `Amanda` → `Mandor`, `AMANDA` →
  `MANDOR`. Las dos palabras miden seis letras: ninguna línea cambia de ancho y Prettier no
  reparte nada. Si el formateador mueve algo tras la sustitución, es señal de que se tocó de más.
- **Lo que no es el nombre no se toca.** `async` y `sync` siguen siendo los nombres internos de
  las apps (carpetas, `kind`, sufijo del `appId`). Las versiones siguen en `0.1.0`. El dominio
  (origen, workspace, colección) no cambia de vocabulario.
- **El scope pasa a `@mandor/*` y nada se publica en npm.** El scope `@mandor` del registro
  público es de un tercero. No importa mientras todo manifiesto siga con `"private": true` y cada
  dependencia interna resuelva por workspace: eso es lo que hay que conservar, y el lockfile tiene
  que seguir resolviendo cada `@mandor/*` como enlace local, nunca contra el registro.
- **Historial limpio.** A `joalvm/mandor` llega el árbol ya renombrado como trabajo nuevo, sobre
  su commit inicial. Ninguna rama, tag ni commit de `joalvm/amanda` se empuja a ese remoto.
  Motivo: el historial privado tiene el nombre viejo, estado local y decisiones que nunca se
  escribieron para ser leídas fuera.
- **El renombre se prueba en local antes de publicarse.** Las fases 1 y 2 se cierran con los gates
  en Docker, en el repositorio privado y sin abrir PR allí: sus minutos de Actions se facturan. El
  PR, con Windows y macOS, se abre en el repositorio público, donde son gratis.
- **Un solo README.** El de `joalvm/mandor` manda. No se reescribe ni se funde con el viejo: solo
  recupera los enlaces a los documentos que llegan con el código.

## No entra aquí

- Firma de Windows y macOS, `publish` en los `electron-builder.yml`, workflow de release, notas de
  versión, documentación de usuario: el resto de `pendiente.md` §1, cada uno con su plan en este
  hito.
- Dominio, organización de GitHub y registro de la marca: los hace el dueño, fuera del repo.
- Capturas de pantalla para el README: entran con el primer release.
- Los tests que fallan a veces en Windows (`pendiente.md` §2). Este plan los destraba —el repo
  pasa a ser público— pero no los arregla.
- Archivar `joalvm/amanda`. Lo decide y lo hace el dueño cuando el público esté verde.

## Librerías antes que código

| Pieza                  | Candidata                               | Decisión                                                                                           |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Sustitución del nombre | `git grep`, `git mv` y un script de uso | Sin dependencia. El script vive fuera del repo y no se commitea: se usa una vez                    |
| Árbol sin historial    | `git archive` de la rama renombrada     | Sin dependencia. Exporta solo lo versionado: lo ignorado y el estado local no pueden colarse       |
| Búsqueda de secretos   | `gitleaks` por Docker, sobre el árbol   | Herramienta de uso, no dependencia del repo. Una pasada antes de publicar; no entra en ningún gate |

El plan no añade dependencias al repo.

## Las dos apps

| Pieza                                 | Dónde vive                | Quién la usa |
| ------------------------------------- | ------------------------- | ------------ |
| Scope, carpeta de datos, puente, tema | `packages/`               | las dos      |
| Nombre visible, `appId`, ejecutable   | `apps/async`, `apps/sync` | cada una     |

El renombre es idéntico en las dos apps y va en el mismo commit. Ninguna diferencia nueva entre
ellas nace aquí.

## Criterios de entrada

No nace ningún paquete, capa ni dependencia.

### [x] Fase 1: El código, las herramientas y lo generado dicen Mandor

**Objetivo.** El árbol compila, pasa `verify` y los e2e de las dos apps sin una sola mención del
nombre viejo fuera de la documentación.

```check
no-match packages /[Aa]manda|AMANDA/
no-match apps /[Aa]manda|AMANDA/
no-match tools /[Aa]manda|AMANDA/
no-match .github /[Aa]manda|AMANDA/
no-match skills /[Aa]manda|AMANDA/
absent package-lock.json "amanda"
matches package.json /"name": "mandor"/
absent eslint.config.js "amanda"
absent vitest.config.ts "amanda"
absent .dependency-cruiser.cjs "amanda"
absent compose.ci.yaml "amanda"
file packages/interop-formats/src/mandor
no-file packages/interop-formats/src/amanda
no-file tools/eslint-rules/amanda-plugin.js
```

**Cambios.** Por forma del nombre, no por archivo. Cada forma se cambia en todo el árbol
versionado de una vez:

- **Scope de paquetes** `@amanda/*`, con sus subrutas de `exports`: manifiestos, importaciones,
  configuración de herramientas, alias de los runners y el verbo `exports` de `tools/plans`.
- **Nombre visible**: `productName`, títulos de ventana, textos de interfaz (fuente de i18n, nunca
  lo generado), nombre y descripción de los instaladores, `executableName`, `artifactName`.
- **Identificadores de instalación**: `appId` `com.mandor.async` y `com.mandor.sync`, carpeta de
  datos `Mandor/`, archivo de log, clave de preferencias.
- **Formato en disco**: el manifiesto del repo de trabajo `mandor.yaml`, la carpeta privada
  `.mandor/` con su regla de ignorado desde el `git init`, la extensión de los archivos de
  intercambio y el formato propio de `interop-formats` (carpetas, nombre del formato, fixtures).
- **Superficies con nombre**: el puente del preload en `window`, las variables CSS y la clase del
  tema de la rejilla, las variables de entorno de desarrollo y de prueba, el prefijo del plugin de
  ESLint y cada comentario que apaga una de sus reglas, cabeceras y correos de prueba, prefijos de
  carpetas temporales.
- **Símbolos**: funciones, tipos y errores que llevan el nombre (`parseAmandaDocument`,
  `AmandaParseError`, `amandaDir`…) pasan a su forma con `Mandor`, conservando el resto.
- **Rutas**: todo archivo o carpeta con el nombre viejo se mueve con `git mv`, para que el
  movimiento quede como movimiento.
- **URL del repositorio**: `github.com/joalvm/mandor` donde hoy apunta al privado (página del
  proyecto y origen de las actualizaciones).
- **Workflows y CI local**: nombres de imagen, de artefacto, de servicio y de caché.
- **Lockfile**: regenerado desde los manifiestos renombrados. Su diff contra el anterior solo
  cambia nombres: ninguna versión se mueve.
- **Generados**: `npm run i18n`, `npm run tokens`, `npm run icons`. Lo generado se commitea.

Trampas conocidas:

- El orden alfabético cambia: `@mandor/*` ya no va antes que `@asyncapi/*` ni que `@codemirror/*`.
  Listas ordenadas de dependencias, de claves o de importaciones se reordenan con su herramienta,
  no a mano.
- Un valor calculado sobre texto que contiene el nombre (un hash fijado en un test, una instantánea)
  se recalcula. No se salta ni se afloja el test.
- Los binarios no se tocan: la sustitución va solo sobre texto, en UTF-8 y con LF.
- Los `no-match` leen el disco, no el índice: una caché sin versionar bajo `packages`, `apps` o
  `tools` que conserve el nombre viejo los tiñe de rojo. Se borra la caché, no se relaja el check.
- La carpeta de datos de desarrollo de esta máquina sigue llamándose como antes: las apps arrancan
  con el origen `Local` vacío. Es lo esperado.

**No hacer.** No tocar la prosa de `docs/` ni los documentos de la raíz: es la fase 2. No añadir
lectores del formato viejo. No subir versiones ni dependencias de paso. No abrir PR en el
repositorio privado.

**Cierre.** `npm ci --foreground-scripts` limpio con el lockfile nuevo. Después, uno a la vez:
`npm run ci:verify`, y con él verde `npm run ci:local` y `npm run ci:installers`. Con
`npm run dev:async` y `npm run dev:sync` abiertas: título de ventana, menú y «Acerca de» dicen
Mandor Realtime y Mandor Request; se crea un workspace y en disco aparece `mandor.yaml` bajo
`Mandor/`.

### [x] Fase 2: La documentación presenta Mandor

**Objetivo.** Quien llega al repositorio lee Mandor en cada documento, y el README es el del
repositorio público.

```check
file docs/specs/mandor.md
no-file docs/specs/amanda.md
no-match docs/specs /[Aa]manda/
absent docs/specs/pendiente.md "Nombre de marca"
contains README.md "API clients that live on your disk"
contains README.es.md "Clientes de API que viven en tu disco"
no-match CONTRIBUTING.md /[Aa]manda/
absent SCRIPTS.md "Amanda"
absent SECURITY.md "Amanda"
absent TRADEMARKS.md "Amanda"
absent CLA.md "Amanda"
no-match docs/revision.md /[Aa]manda/
absent docs/plans/TEMPLATE.md "amanda"
```

**Cambios.**

- `README.md`, `README.es.md` y `TRADEMARKS.md` se traen tal cual de `joalvm/mandor`. No se
  redactan de nuevo.
- La spec de lo construido pasa a `docs/specs/mandor.md` y cada enlace a ella la sigue. Su
  contenido cambia de nombre y de nada más.
- `pendiente.md`: la fila «Nombre de marca» se borra y lo decidido —nombre, `appId`, carpeta de
  datos— queda en la spec, en una línea.
- Guías de la raíz y de `docs/`: mismo cambio de nombre, releyendo cada frase. Aquí la sustitución
  mecánica no basta: una frase que explicaba el nombre viejo se reescribe o se borra.
- `docs/plans/README.md` enlaza la spec con su nombre nuevo.

**No hacer.** No reestructurar la spec ni las guías. No actualizar `packages/README.md` más allá
del nombre: su atraso es `pendiente.md` §4. No tocar todavía las frases que dependen de que el
código ya sea público: es la fase 3.

**Cierre.** `npx prettier --check` sobre lo tocado y `npm run plans`. Una búsqueda final,
`git grep -il amanda`, que solo puede devolver este plan y el índice del hito.

### [x] Fase 3: El código está en el repositorio público, protegido y en verde

**Objetivo.** `joalvm/mandor` tiene el código completo en `main`, con su CI verde en las tres
plataformas y las mismas reglas de protección que tenía el privado.

```check
matches README.md /live on your disk[\s\S]*CONTRIBUTING\.md/
matches README.es.md /viven en tu disco[\s\S]*CONTRIBUTING\.md/
absent docs/specs/pendiente.md "hasta que el repo sea público"
```

**Cambios.**

- **Antes de publicar, una pasada sobre el árbol exportado**: búsqueda de secretos, de rutas
  absolutas de máquina y de datos personales. El único dato personal esperado es el correo del
  `maintainer` de los paquetes `deb`: se pregunta al dueño cuál quiere ver publicado. Cualquier
  otro hallazgo se arregla en el privado, en su propio commit, y se vuelve a exportar.
- **Entrega**: en un clon de `joalvm/mandor`, una rama desde su `main` recibe el árbol versionado
  de la rama renombrada, entero y de una vez, encima del commit inicial. Lo que ya existe allí con
  la misma ruta se sobrescribe y tiene que quedar idéntico.
- **README**: gana la sección de contribución con sus enlaces (`CONTRIBUTING.md`, `SECURITY.md`,
  `SCRIPTS.md`, `CLA.md`) y pierde la frase que anunciaba que el código venía en camino. El aviso
  de primer release se queda: sale con el release.
- **`pendiente.md` §2**: deja de decir que los tests de Windows esperan a que el repo sea público;
  dice que ya se pueden perseguir.
- **PR en `joalvm/mandor`** contra `main`. El gate de contribución mide el rango completo, y aquí
  el rango es el repositorio entero: una regla que falle sobre código que en el privado entró bien
  se corrige en el código, no se exime ni se parte el PR para esquivarla.
- **Ajustes del repositorio**, cuando el primer run haya dado nombre a los checks: protección de
  `main` copiada de la del privado (PR obligatorio, los mismos checks estrictos, historia lineal,
  sin force push ni borrado), solo squash, borrado de rama al fusionar, alertas y actualizaciones
  de seguridad de Dependabot, escaneo de secretos con protección de push y reporte privado de
  vulnerabilidades.
- **Fusión** por squash con todos los checks verdes sobre los mismos SHA.

**No hacer.** No empujar ramas ni tags del privado al remoto público. No reescribir el commit
inicial del público. No archivar, borrar ni renombrar `joalvm/amanda`. No crear un release ni un
tag de versión. No relajar un check ni subir reintentos para llegar al verde: un fallo solo de
Windows que ya está en `pendiente.md` §2 se relanza con `gh run rerun <run> --failed`; uno nuevo
se arregla.

**Cierre.** En `joalvm/mandor`: `gh pr checks` todo verde antes de fusionar;
`gh api repos/joalvm/mandor/branches/main/protection` devuelve los checks exigidos; un clon limpio
de `main` pasa `npm ci --foreground-scripts` y `npm run ci:verify`. Desde ese momento se trabaja
en el clon del público. Se avisa al dueño de que `joalvm/amanda` queda listo para archivar y de
que los archivos locales que git ignora no viajan con el clon: los copia él.

## Deudas

Ninguna todavía.
