# CI local y gate en GitHub

Comandos y cuándo usarlos: `CONTRIBUTING.md` §Gates. Aquí, lo que esa tabla no dice.

## Ensayo en Docker

Requisitos: Docker Desktop con motor Linux y 8 GiB en su VM. La base de QA es `origin/main`,
traída con `git fetch`.

- Cada `ci:*` construye una imagen del árbol de trabajo (lo no commiteado entra) sobre Ubuntu
  24.04 y Node 26, con las dependencias exactas del lockfile. Instala desde los manifiestos antes
  de copiar el árbol: un cambio de código reutiliza la instalación; tocar un `package.json` o el
  lockfile la repite.
- El contenedor trabaja sobre una copia en disco Linux, sin `.git`, credenciales, `.env` ni
  `node_modules` del host, como usuario sin privilegios.
- Recursos: 2 CPU, 6 GiB **sin swap** (`MANDOR_CI_MEMORY`), 1 GiB de memoria compartida. Por
  debajo del runner de GitHub: si pasa aquí, cabe allí. Un run que se pasa muere por OOM y lo
  dice. Más CPU: `MANDOR_CI_CPUS=4` y `MANDOR_CI_CPUSET=0-3`.
- Un solo run a la vez: `docker-ci.mjs` se niega a arrancar si hay otro vivo y borra el suyo al
  terminar.
- Informe en `.local-ci/run-XXXXXXXX/`: `metadata.json` (head, base, estado del árbol),
  `output.log` y los `test-results/` de Playwright. Se conserva aunque falle. El resultado real
  es la línea `Local CI reports … (exit N)`.
- `npm run ci:e2e -- <filtro>` corre solo las specs cuya ruta contiene el filtro.
- QA revisa commits, no archivos sin commit. `QA_BASE`, `QA_BRANCH` y `QA_TITLE` reproducen los
  metadatos de un PR.
- Shell de diagnóstico: `npm run ci:build` y `docker compose -f compose.ci.yaml run --rm ci bash`.
- `ci:installers` construye AppImage y deb de las dos apps, sin publicar. No va en `ci:local`.
- `update-e2e` no tiene ensayo local: AppImage pide FUSE y NSIS pide Windows.

Docker valida Linux. Windows se comprueba en el host con `npm run verify` y `npm run test:e2e -w
apps/<app>`; macOS, en un Mac o en su runner. `tools/tests/ci/local-ci.test.mjs` comprueba que los
comandos locales son los del job Linux de `ci.yml`.

## Gate en GitHub

`ci.yml` más `contribution rules` de `qa.yml`: seis checks requeridos. Se factura por minuto y
por job: Linux ×1, Windows ×2, macOS ×10.

| Check                     | Qué corre                                   | Cuándo                                         |
| ------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `verify (ubuntu-latest)`  | `npm run verify` completo; guarda el build  | siempre, primero                               |
| `verify (windows-latest)` | `npm run test:node`                         | tras Linux en verde                            |
| `e2e (ubuntu-latest)`     | e2e de las dos apps sobre el build de Linux | el PR cambia algo más que prosa                |
| `e2e (windows-latest)`    | lo mismo, cada app en su runner             | igual                                          |
| `e2e (macos-latest)`      | lo mismo, cada app en su runner             | la app toca el sistema, o etiqueta `e2e:macos` |

- El alcance lo calcula `tools/ci/changed-scope.mjs`. Prosa (`docs/`, `skills/`, `*.md`) no abre
  ninguna ventana.
- Un job saltado por su condición cuenta como superado: los checks son jobs fijos, sin matriz.
- Todo job lleva `timeout-minutes`. En CI, Playwright reintenta una vez y para a los tres fallos.
- `installers` arranca solo si el PR toca un `electron-builder.yml`, `tools/ci/Dockerfile` o su
  workflow. `update-e2e` (beta → estable sobre instalación real, Linux y Windows, ~42 minutos
  facturados) solo si toca el updater, su prueba o su workflow, y a mano.
- `tools/tests/ci/ci-workflow.test.mjs` fija todo lo anterior.
