# Plan 02 — La ventana se dibuja en un marco con tarjetas encima

## Contexto

El rediseño del primer release está elegido: dirección B, «tres paneles», densidad cómoda, centro
de comandos en la barra de título y consola abajo. El tablero de diseño es la referencia visual de
este plan y de los dos siguientes. Este plan pone el **marco**: el fondo de la ventana, las
pestañas que flotan sobre él, la tarjeta en la que se dibuja cada pestaña, la consola como tarjeta
y el centro de comandos. Lo que va dentro de una pestaña de request o de conexión es del plan 03.

Qué hay hoy:

- El cromo va en `surface-panel` y el trabajo en `surface-app`:
  `packages/ui/src/components/layout/TitleBar.tsx:25` (con `border-b`), `StatusBar.tsx:13`,
  `SidePanel.tsx:21`, `AppShell.tsx:15` y `Workbench.tsx:15`. En oscuro el cromo es más claro que
  el trabajo; en B es al revés: el marco es lo más hondo y las tarjetas suben un paso.
- La tira de pestañas de la rejilla va en `surface-panel` y cierra con una línea
  (`packages/shell/src/styles/grid.css:30` y `:134`). La pestaña mide 24 (`--mandor-height-tab`,
  que también usa `TabsTab` dentro de los paneles) con radio `md` de 3 px (`grid.css:63`, `:66`).
- El velo de puntero cae también sobre la pestaña activa (`grid.css:129`): la regla de estados
  dice que la activa no cambia bajo el puntero y que una inactiva señalada toma el tono de
  seleccionado.
- La consola es una franja con línea arriba sobre `surface-app`
  (`packages/shell/src/components/console/ConsolePanel.tsx:27`), pegada al trabajo por un
  `SplitPane` sin hueco (`ConsoleDock.tsx`).
- El hueco central de la barra está vacío en las dos apps (`data-part="title-search"` en
  `apps/async/src/renderer/app/AsyncTitleBar.tsx:46` y `apps/sync/src/renderer/app/SyncTitleBar.tsx:43`).
  La paleta solo se abre con `$mod+Shift+KeyP`.
- `apps/async/tests/e2e/chrome-shape.spec.ts` fija la forma de hoy: el cromo igual a
  `--surface-panel` y la pestaña con `mandor-radius-md`. Cambia con este plan.

## Decisiones base

- **Dos superficies con nombre de papel: `surface-frame` y `surface-card`.** No se reutilizan
  `surface-app` ni `surface-panel`: en oscuro se invierten (marco `neutral-dark-1`, tarjeta
  `neutral-dark-2`) y en claro no (marco `neutral-light-2`, tarjeta `neutral-light-1`). Un nombre
  viejo con otro papel según el tema confunde al siguiente que lo lea.
- **El tono de claro del marco es `#f4f4f4`.** Se fija en `CHROME` de
  `packages/ui/tools/build-tokens.mjs` como `gray2`, igual que ya se fijan `gray1`, `gray3`,
  `gray4` y `gray5`. Lo que hoy pinta `neutral-light-2` sale un punto más hondo; nadie más que el
  cromo lo usa de fondo grande.
- **Hueco de 8 y radio de 10 para la densidad cómoda.** `--mandor-gap-gutter: 8px` y
  `--mandor-radius-panel: 10px` en `scales.css`. La densidad compacta (plan 03) los pone a 0.
- **La pestaña de la rejilla tiene su propia altura.** `--mandor-height-grid-tab: 28px` y
  `--mandor-height-strip: 38px` para la tira; `--mandor-height-tab` (24) se queda para las pestañas
  de dentro de un panel. Radio de la pestaña: `--mandor-radius-xl` (6), que ya existe.
- **Estados de la pestaña.** Inactiva sin relleno; activa con `surface-tab-active` y sin velo bajo
  el puntero; inactiva señalada con `surface-chrome-control`, un paso por debajo de la activa.
  Nunca acento.
- **La tarjeta es una pieza de composición.** `Card` en `@mandor/ui`: un contenedor con su
  superficie, su radio y `overflow-hidden`, que recibe hijos. Cada `TabKind` envuelve su cuerpo en
  ella; nada la pinta por prop.
- **El centro de comandos es un botón que abre la paleta.** No es un campo de búsqueda: el texto
  es `shell:searchCommands` («Buscar comandos») y el atajo se lee de `DEFAULT_SHORTCUTS`, no se
  escribe. Abre la superficie `PALETTE_SURFACE` que ya existe.

## No entra aquí

- Request en tres tarjetas, Realtime en tres tarjetas, foco sin anillo exterior y densidad
  compacta: plan 03.
- Diálogos, avisos, menús, tooltips y paleta: plan 04.
- `Table` y `table.css`: el diseño de la tabla está cerrado y ningún plan lo toca.

## Librerías antes que código

| Pieza                 | Candidata                                     | Decisión                                                         |
| --------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Pestañas flotantes    | `dockview-react` (ya en el repo), sus vars    | Se queda. Todo es CSS sobre su tema `dockview-theme-mandor`      |
| Hueco entre mitades   | `SplitPane` propio de `@mandor/ui`            | Se amplía con un hueco tipado; ninguna librería de split entra   |
| Centro de comandos    | La paleta propia de `shell` y `tinykeys`      | Botón que abre la superficie existente; nada nuevo               |
| Superficies y medidas | `@radix-ui/colors` y `tools/build-tokens.mjs` | Dos tokens semánticos y cuatro de escala; el generador ya existe |

El plan no añade dependencias.

## Las dos apps

| Pieza                                      | Dónde vive                              | Quién la usa                   |
| ------------------------------------------ | --------------------------------------- | ------------------------------ |
| Tokens, `Card`, `SplitPane` con hueco      | `packages/ui`                           | las dos                        |
| Tira de pestañas, consola, `CommandCenter` | `packages/shell`                        | las dos                        |
| Tarjeta de cada pestaña                    | el `TabKind` de cada paquete o app      | cada `TabKind`, en el mismo PR |
| Barra de título                            | `AsyncTitleBar.tsx`, `SyncTitleBar.tsx` | cada app monta `CommandCenter` |

Ninguna diferencia nueva entre las apps: las dos ganan lo mismo en el mismo PR.

## Criterios de entrada

`Card` y `CommandCenter` nacen con dos consumidores reales: `Card` la usan los once `TabKind` y la
consola; `CommandCenter` lo montan las dos barras de título.

### [x] Fase 1: Marco y tarjeta como superficies de la ventana

**Objetivo.** La ventana pinta su cromo (barra de título, lateral, barra de estado) sobre el marco,
sin línea bajo la barra de título, y el área de trabajo deja un hueco a la derecha.

```check
contains packages/ui/src/styles/semantic.css "--surface-frame:"
contains packages/ui/src/styles/semantic.css "--surface-card:"
contains packages/ui/src/styles/semantic-dark.css "--surface-frame: var(--primitive-neutral-dark-1)"
contains packages/ui/src/styles/scales.css "--mandor-gap-gutter: 8px"
contains packages/ui/src/styles/scales.css "--mandor-radius-panel: 10px"
contains packages/ui/src/styles/index.css "--color-surface-frame: var(--surface-frame)"
contains packages/ui/src/styles/index.css "--spacing-gap-gutter: var(--mandor-gap-gutter)"
contains packages/ui/src/styles/index.css "--radius-panel: var(--mandor-radius-panel)"
contains packages/ui/tools/build-tokens.mjs "gray2: '#f4f4f4'"
contains packages/ui/src/styles/token-scale-values.ts "mandor-gap-gutter"
contains packages/ui/src/components/layout/TitleBar.tsx "bg-surface-frame"
absent packages/ui/src/components/layout/TitleBar.tsx "border-b"
contains packages/ui/src/components/layout/StatusBar.tsx "bg-surface-frame"
contains packages/ui/src/components/layout/SidePanel.tsx "bg-surface-frame"
contains packages/ui/src/components/layout/AppShell.tsx "bg-surface-frame"
contains apps/async/tests/e2e/chrome-shape.spec.ts "--surface-frame"
```

**Cambios.**

- `packages/ui/tools/build-tokens.mjs`: `gray2: '#f4f4f4'` en `CHROME`, con una línea más en el
  comentario que dice por qué. `npm run tokens` regenera `primitives.css` y los `token-*-values.ts`.
- `semantic.css` y los dos bloques de `semantic-dark.css` (el de `prefers-color-scheme` y el de
  `[data-theme]`): `--surface-frame` y `--surface-card` con los pasos de las decisiones.
  `semantic-contrast.css`, si sus temas redefinen superficies, las define también.
- `scales.css`: `--mandor-gap-gutter` y `--mandor-radius-panel`. `index.css`: los alias
  `--color-surface-frame`, `--color-surface-card`, `--spacing-gap-gutter`, `--radius-panel`.
- `TitleBar.tsx`, `StatusBar.tsx`, `SidePanel.tsx`, `AppShell.tsx`, `Workbench.tsx`: al marco. La
  barra de título pierde `border-b border-border-subtle`. `AppBody.tsx` deja el hueco del área de
  trabajo: `gap-gap-gutter` entre lateral y trabajo y `pr-gap-gutter` al borde derecho.
- `packages/ui/tests/styles/contrast.test.ts`: en cada tema, `surface-card` distinto de
  `surface-frame`, y `text-secondary` sobre `surface-frame` pasa AA.
- `chrome-shape.spec.ts`: el cromo se compara con `--surface-frame`; el trabajo, con
  `--surface-frame` también (el trabajo ya no tiene superficie propia: la ponen las tarjetas).
- `tools/ui-lab/src/foundations/color-semanticos/superficies-tokens.ts`: las dos superficies nuevas.

**No hacer.** Tocar la tira de pestañas ni el cuerpo de las pestañas: fases 2 y 3.

**Cierre.** `npm run ci:check -- packages/ui apps/async/tests/e2e/chrome-shape.spec.ts`. Con
`npm run dev:sync`: barra de título, lateral y barra de estado sobre un mismo fondo, sin línea
entre la barra de título y lo de abajo, en claro y en oscuro.

### [x] Fase 2: Pestañas que flotan sobre el marco

**Objetivo.** La tira de pestañas no tiene fondo propio ni línea debajo; cada pestaña mide 28,
redondea 6 y sigue la regla de estados.

```check
contains packages/ui/src/styles/scales.css "--mandor-height-grid-tab: 28px"
contains packages/ui/src/styles/scales.css "--mandor-height-strip: 38px"
contains packages/shell/src/styles/grid.css "--dv-tabs-and-actions-container-background-color: var(--surface-frame)"
contains packages/shell/src/styles/grid.css "--dv-tabs-and-actions-container-height: var(--mandor-height-strip)"
contains packages/shell/src/styles/grid.css "height: var(--mandor-height-grid-tab)"
contains packages/shell/src/styles/grid.css "border-radius: var(--mandor-radius-xl)"
absent packages/shell/src/styles/grid.css ".dv-tab:hover {"
contains packages/shell/src/styles/grid.css ".dv-tab:not(.dv-active-tab):hover"
absent packages/shell/src/styles/grid.css "border-bottom: 1px solid var(--border-subtle)"
contains apps/async/tests/e2e/chrome-shape.spec.ts "mandor-radius-xl"
```

**Cambios.**

- `scales.css` e `index.css`: los dos tokens de altura y sus alias `--spacing-*`. `npm run tokens`.
- `grid.css`:
    - La tira en `surface-frame` y a `--mandor-height-strip`. La regla que cierra la tira con una
      línea (`.dv-tabs-and-actions-container { border-bottom … }`) se borra con su comentario.
    - `.dv-tab` a `--mandor-height-grid-tab` y `--mandor-radius-xl`. El padding de inicio de la
      tira pasa a 0: la primera pestaña empieza donde empieza la tarjeta de abajo.
    - El velo de puntero sale de `.dv-tab:hover` y pasa a `.dv-tab:not(.dv-active-tab):hover`,
      que pone `--tab-fill: var(--surface-chrome-control)`. El comentario de la regla dice la
      regla nueva: la activa no cambia bajo el puntero.
    - `--dv-group-view-background-color` a `surface-frame`.
- `chrome-shape.spec.ts`: `ROUNDED` lee `mandor-radius-xl`. Se añade una aserción: el fondo de
  la tira es el del marco.

**No hacer.** La tarjeta del cuerpo de la pestaña (fase 3) ni la consola (fase 4).

**Cierre.** `npm run ci:test -- apps/async/tests/e2e/chrome-shape.spec.ts`; luego
`npm run ci:check -- packages/shell packages/ui`. Con la app abierta: pasar el puntero por la
activa no la cambia; por una inactiva, toma un gris un paso más claro que la activa.

### [x] Fase 3: Cada pestaña se dibuja en una tarjeta

**Objetivo.** El cuerpo de toda pestaña va sobre una tarjeta redondeada, separada del lateral y
del borde por el hueco del marco.

```check
file packages/ui/src/components/layout/Card.tsx
exports @mandor/ui "{ Card }"
# `tested` daría verde por HoverCard: el test de layout tiene que montar la tarjeta.
matches packages/ui/tests/components/layout.test.tsx /<Card[ >]/
contains packages/ui/src/components/layout/Card.tsx "bg-surface-card"
contains packages/ui/src/components/layout/Card.tsx "rounded-panel"
contains packages/repos/src/OriginsTabKind.tsx "<Card>"
contains packages/workspace/src/WorkspacesTabKind.tsx "<Card>"
contains packages/collections/src/ItemTabKind.tsx "<Card>"
contains packages/docs/src/DocTabKind.tsx "<Card>"
contains apps/async/src/renderer/features/connections/ConnectionTabKind.tsx "<Card>"
contains apps/sync/src/renderer/features/history/HistoryTabKinds.tsx "<Card>"
```

**Cambios.**

- `packages/ui/src/components/layout/Card.tsx`: `<section data-part="card">` con
  `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel bg-surface-card`, hijos y
  nada más. Si recibe nombre accesible, por `aria-label` o `aria-labelledby` que pasa el llamador
  (el chequeo de diseño pide nombre a una `section`). Exportado en el barril.
- `packages/ui/tests/components/layout.test.tsx`: monta `<Card>` y comprueba su parte y sus hijos.
- Los once `TabKind` que usan `<TabBody>` envuelven su cuerpo en `<Card>`: `FolderTabKind`,
  `ItemTabKind` (collections), `DocTabKind`, `DocPreviewTabKind` (docs), `ConflictTabKind`,
  `OriginsTabKind` (repos), `WorkspacesTabKind` (workspace), `ConnectionTabKind` (async),
  `HistoryTabKinds`, `LooseRequestTabKind`, `RequestExampleTabKind` (sync).
- `grid.css`: el contenido del grupo deja el hueco abajo (`--mandor-gap-gutter`); dos grupos lado
  a lado quedan separados por el hueco y no por una línea (`--dv-separator-border: transparent`).
  El asa de redimensionar vive en el hueco y se ve al señalarla, como hoy.
- Los fondos propios que quedan dentro de una pestaña y ahora pintan un rectángulo gris sobre la
  tarjeta (`ActivityPanel.tsx:186`, la cabecera de `Panel.tsx:23`) pasan a `bg-surface-card`.

**No hacer.** Partir request o conexión en tres tarjetas: plan 03. Tocar `table.css`.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/layout.test.tsx`; luego
`npm run ci:check` con las rutas tocadas. Con las dos apps: abrir una pestaña de cada tipo
(request, conexión, carpeta, documento, Orígenes, Workspaces, historial) y ver la tarjeta con sus
cuatro esquinas redondeadas y el hueco a la derecha y abajo; partir el grupo en dos y ver el hueco
entre los dos.

### [x] Fase 4: La consola es una tarjeta bajo el trabajo

**Objetivo.** La consola abierta es una tarjeta separada del trabajo por el hueco, sin línea
arriba; se sigue redimensionando por el asa, que vive en el hueco.

```check
absent packages/shell/src/components/console/ConsolePanel.tsx "border-t"
contains packages/shell/src/components/console/ConsolePanel.tsx "<Card"
contains packages/ui/src/components/split/SplitPane.tsx "gap?:"
matches packages/shell/src/components/console/ConsoleDock.tsx /gap="gutter"/
contains packages/ui/src/styles/runtime.css "[data-gap='gutter']"
```

**Cambios.**

- `SplitPane.tsx`: prop `gap?: 'none' | 'gutter'`, `'none'` por defecto, escrita en
  `data-gap`. Con `gutter`, `runtime.css` abre el hueco del marco entre las dos mitades (en fila y
  en columna) y centra el asa en él; la línea del asa (`before:bg-border-subtle`) no se pinta con
  hueco: el hueco ya separa, y al señalarla se ve `border-hover` como hoy. Con `'none'` nada
  cambia: lo comprueba un test de `packages/ui/tests/components/split/`.
- `ConsoleDock.tsx`: `gap="gutter"`.
- `ConsolePanel.tsx`: su raíz pasa a `<Card aria-label={…}>` con el texto que ya usa la cabecera;
  sin `border-t` ni `bg-surface-app`. La banda de cabecera sigue igual.

**No hacer.** Usar el hueco dentro de request o conexión: plan 03.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/split packages/shell/tests` (los de
consola); `npm run ci:check` con las rutas tocadas. Con la app: abrir la consola desde la barra de
estado, arrastrar el asa, doble clic para volver a su sitio, cerrar y abrir.

### [x] Fase 5: Centro de comandos en la barra de título

**Objetivo.** Un botón centrado en la barra de título de las dos apps abre la paleta de comandos y
muestra su atajo.

```check
file packages/shell/src/components/title-bar/CommandCenter.tsx
tested packages/shell/src/components/title-bar/CommandCenter.tsx
exports @mandor/shell CommandCenter
contains packages/shell/src/components/title-bar/CommandCenter.tsx "PALETTE_SURFACE"
contains packages/shell/src/components/title-bar/CommandCenter.tsx "searchCommands"
contains packages/shell/src/components/title-bar/CommandCenter.tsx "whitespace-nowrap"
contains apps/async/src/renderer/app/AsyncTitleBar.tsx "<CommandCenter"
contains apps/sync/src/renderer/app/SyncTitleBar.tsx "<CommandCenter"
contains packages/ui/src/styles/scales.css "--mandor-width-command-center"
```

**Cambios.**

- `CommandCenter.tsx` en `packages/shell/src/components/title-bar/`: un `button` con la lupa de
  Codicons, el texto `shell:searchCommands` y el atajo de `shell.commandPalette` sacado de
  `DEFAULT_SHORTCUTS` con `shortcutLabel(…, isApplePlatform())`. Al pulsar:
  `windowSurface(PALETTE_SURFACE)?.open(shellStore.getState())`, como hace `OpenHistoryButton`.
  Ancho `--mandor-width-command-center` (440 px en `scales.css`), alto `h-field`, relleno
  `surface-chrome-control`, una línea siempre: `whitespace-nowrap`, el texto con `truncate`, y
  `min-w-0` para encogerse antes que partir. Foco recoloreando su borde (`data-focus-frame` con
  borde transparente), nunca anillo exterior.
- `AsyncTitleBar.tsx` y `SyncTitleBar.tsx`: el `div` de `title-search` monta `<CommandCenter />`.
  Se centra en la ventana y no en el hueco que queda: el hueco crece igual a los dos lados, o el
  botón se posiciona sobre el centro de la barra; lo que se elija, lo prueba el test.
- Los comentarios de las dos barras que dicen «empty today» pasan a decir lo que hay.
- Test en `packages/shell/tests/components/title-bar/`: el botón tiene nombre accesible, muestra
  el atajo y abre la superficie registrada (doble global del puente, sin mock).

**No hacer.** Buscar dentro del botón (no es un campo), cambiar la paleta (plan 04) o cambiar el
atajo.

**Cierre.** `npm run ci:test -- packages/shell/tests/components/title-bar`; `npm run ci:verify` al
cerrar el plan. Con las dos apps: el botón centrado, en una línea a cualquier ancho de ventana,
clic y `Ctrl+Shift+P` abren la misma paleta.

## Deudas

Ninguna todavía.
