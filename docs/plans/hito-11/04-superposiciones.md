# Plan 04 — Diálogos, avisos y menús flotan sólidos sobre la ventana

## Contexto

Los planes 02 y 03 rehacen la ventana: marco, tarjetas y foco sin anillo. Lo que flota encima
sigue con el dibujo anterior, y la dirección B lo cambia en cuatro sitios:

- **Diálogo.** `packages/ui/src/components/dialog/dialog-frame.ts` dibuja la superficie con
  `rounded-xl` (6 px). `DialogNav.tsx` y `DialogNavItem.tsx` pintan la navegación con
  `bg-surface-dialog-nav` y `bg-surface-dialog-nav-active`, un segundo color dentro del mismo
  diálogo. El relleno lateral es `--mandor-pad-inline-dialog: 16px` (`scales.css:70`) y la
  entrada (`runtime.css:718`) desliza `translateY(6px) scale(0.98)`.
- **Ajustes e Importar.** Los ajustes de la app se leen como lista con líneas
  (`runtime.css:640-658`), sin grupo que los contenga. Los árboles y cajas de elegir e importar
  se pintan en gris de panel: `ChoiceTree.tsx:89`, `ImportSummaryCard.tsx:20`,
  `ImportDropzone.tsx:25` (`packages/exchange/src/`) y `SaveRequestDialog.tsx:82`
  (`apps/sync/src/renderer/features/requests/components/save/`).
- **Aviso.** `packages/ui/src/components/toast/ToastItem.tsx` es una fila de 320 px
  (`Toast.tsx:20`, `w-80`) con radio 4, el glifo de tono suelto, la acción como enlace
  (`variant="link"`, línea 111) y el contador `×N` como texto. La pila es una lista que crece
  hacia arriba con un «N más» encima.
- **Menús y capas.** `MenuContent`, `ContextMenuContent`, `PopoverPanel`, `HoverCardPanel`,
  `Tooltip`, `SuggestList`, `Select` y la paleta (`packages/shell/src/components/command-palette/`)
  llevan `border-border-strong`, un contorno duro que hace parecer gris lo que es blanco. Las
  filas de menú miden `h-row-xs` con `text-xs`.
- **Tablas de listado.** `TableRowActions.tsx` esconde las acciones hasta que el puntero o el
  foco llegan a la fila (`table.css:161-189`). Es lo correcto para params, headers y variables;
  en Orígenes (`packages/repos/src/components/panel/OriginRow.tsx:80`) y Workspaces
  (`packages/workspace/src/components/panel/WorkspaceRow.tsx:48`) las acciones son lo único que
  se hace con la fila y tienen que estar siempre a la vista.

## Decisiones base

- **Una superficie por diálogo.** Navegación, cabecera, cuerpo y pie comparten
  `bg-surface-dialog`, sin línea entre ellos ni banda de pie. La entrada activa de la
  navegación se marca con `bg-surface-selected`, el mismo gris de selección de la ventana.
  `--surface-dialog-nav` y `--surface-dialog-nav-active` desaparecen.
- **Radio de lo que flota: `--mandor-radius-overlay: 12px`**, para diálogo y aviso. Menús,
  capas, paleta y sugerencias usan `--mandor-radius-panel` (10 px, plan 02). El tooltip se queda
  en `rounded-md`.
- **Medidas del diálogo.** `--mandor-pad-inline-dialog` pasa a 24 px; dentro de un diálogo
  `--mandor-height-control` vale 32 px. El título sigue en `text-lg` (16 px) semibold. Los
  diálogos de formulario no ganan subtítulo: no tienen texto que lo diga, y ninguna cadena nace
  para el dibujo. `ConfirmDialog` y `SaveChangesDialog` ya tienen su descripción.
- **Movimiento.** Entrada de 200 ms con `--mandor-ease-out`, de `opacity: 0; scale(0.96)` a
  reposo; salida de 150 ms a lo mismo. Desde el centro, sin deslizar.
- **Grupos blancos.** Las filas de un grupo de ajustes van en una caja `bg-surface-raised` con
  `border-border-subtle` y `--mandor-radius-panel`, con su línea fina entre filas. El título del
  grupo queda encima, fuera de la caja, sin línea debajo. Árboles y cajas de elegir e importar
  pasan de `bg-surface-panel` a `bg-surface-raised`.
- **El aviso es una tarjeta.** 380 px (`--mandor-width-toast`), `rounded-overlay`, el glifo de
  tono dentro de una insignia de 32 px en `bg-surface-control` (el glifo conserva su color de
  tono; la insignia no se tiñe), una sola acción como `Button` secundario, y el `×N` como píldora
  en `bg-surface-control`.
- **Pila de tres.** En reposo se ve el aviso más nuevo y, detrás, los dos anteriores asomando:
  `translateY(-10px) scale(0.95)` y `translateY(-20px) scale(0.9)`. Con el puntero o el foco en
  la pila, se abren en lista con su hueco. «N más» sigue para lo que no cabe. Las transiciones
  usan los tokens de duración, que el bloque `prefers-reduced-motion` de `scales.css` ya pone a
  cero.
- **Menús sólidos.** `border-border-subtle`, `rounded-panel`, filas `h-control text-sm` con
  `data-highlighted:bg-surface-selected`. Lo mismo en `Select`, `SuggestList` y la paleta.
- **Acciones siempre a la vista, solo donde se piden.** `TableRowActions` gana
  `reveal?: 'hover' | 'always'`, por defecto `'hover'`, escrito en `data-reveal`. `table.css`
  recibe reglas nuevas para `[data-reveal='always']` y ninguna de las que hay cambia: la tabla
  está cerrada y las de params, headers y variables siguen igual.

## No entra aquí

- El dibujo de `Table` y `table.css` más allá de las reglas añadidas de `data-reveal`.
- Orígenes y Workspaces siguen siendo pestañas; no pasan a diálogo.
- Iconos en diálogos de alerta: no llevan, y este plan no los añade.

## Librerías antes que código

| Pieza            | Candidata                | Decisión                                                                                   |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Pila de avisos   | `sonner`                 | No entra: el aviso ya es Radix Toast en `ui`, con su teclado y su deslizar; la pila es CSS |
| Diálogo y menús  | `radix-ui` (ya en `ui`)  | Se queda; solo cambian clases y tokens                                                     |
| Acciones de fila | `TableRowActions` propio | Se amplía con una prop; nada nuevo                                                         |

El plan no añade dependencias.

## Las dos apps

Todo vive en `packages/ui`, `packages/shell`, `packages/exchange`, `packages/repos` y
`packages/workspace`, y las dos apps lo montan ya. La única pieza de una sola app es
`SaveRequestDialog.tsx` (Mandor Request), que existe solo allí por la fila «Colecciones» de la
tabla de diferencias de `mandor.md`: los requests tienen destino propio y se guardan en una
colección; los eventos de Realtime no.

## Criterios de entrada

Ningún paquete, capa ni dependencia nueva.

### [ ] Fase 1: El diálogo es una sola superficie

**Objetivo.** Un diálogo con navegación (Ajustes, Importar) se lee como una pieza: un color, sin
líneas internas, radio 12, relleno 24, controles de 32 y una entrada que crece desde el centro.

```check
no-match packages/ui/src /surface-dialog-nav/
no-match tools/ui-lab/src /surface-dialog-nav/
contains packages/ui/src/styles/scales.css "--mandor-radius-overlay: 12px"
contains packages/ui/src/styles/scales.css "--mandor-pad-inline-dialog: 24px"
contains packages/ui/src/components/dialog/dialog-frame.ts "rounded-overlay"
absent packages/ui/src/styles/runtime.css "translateY(6px) scale(0.98)"
```

**Cambios.**

- `scales.css`: `--mandor-radius-overlay: 12px` y `--mandor-pad-inline-dialog: 24px`.
  `index.css`: alias `--radius-overlay`. `npm run tokens`.
- `semantic.css`, `semantic-dark.css` (los dos bloques) y `index.css`: fuera
  `--surface-dialog-nav` y `--surface-dialog-nav-active`. `npm run tokens` los quita de
  `token-color-values.ts`.
- `DialogNav.tsx` sin fondo; `DialogNavItem.tsx` activo con `bg-surface-selected`.
- `dialog-frame.ts`: `DIALOG_SURFACE` con `rounded-overlay`.
- `runtime.css`: fuera las líneas entre navegación, cabecera, cuerpo y pie, si las hay; el pie
  sin banda. `[data-part='dialog'] { --mandor-height-control: 32px; }`. Las dos `@keyframes`
  según las decisiones, con 200 y 150 ms.
- `packages/ui/tests/styles/contrast.test.ts:104-105` deja de medir el par de navegación; mide
  la entrada activa (`surface-selected` sobre `surface-dialog`).
- `tools/ui-lab/src/foundations/color-semanticos/superficies-tokens.ts` sin los dos tokens.

**No hacer.** Tocar los grupos de ajustes (fase 2) ni el aviso (fase 3).

**Cierre.** `npm run ci:test -- packages/ui/tests/components/dialog packages/ui/tests/styles`;
`npm run ci:check` con las rutas tocadas. Con las dos apps: abrir Ajustes e Importar en tema
claro, oscuro y de contraste; ninguna banda ni línea parte el diálogo.

### [ ] Fase 2: Ajustes e Importar en grupos blancos

**Objetivo.** Cada grupo de ajustes es una caja blanca con sus filas; los árboles y cajas de
elegir e importar dejan el gris de panel.

```check
contains packages/ui/src/styles/runtime.css "border-radius: var(--mandor-radius-panel)"
no-match packages/exchange/src /bg-surface-panel/
absent apps/sync/src/renderer/features/requests/components/save/SaveRequestDialog.tsx "bg-surface-panel"
```

**Cambios.**

- `runtime.css` (bloque de `app-settings`): `settings-rows` pasa a caja con
  `background: var(--surface-raised)`, `border: 1px solid var(--border-subtle)`,
  `border-radius: var(--mandor-radius-panel)` y su relleno lateral; las filas conservan su línea
  entre ellas. El `h3` del grupo pierde su `border-block-end` y queda encima de la caja.
- `ChoiceTree.tsx`, `ImportSummaryCard.tsx`, `ImportDropzone.tsx` y `SaveRequestDialog.tsx`:
  `bg-surface-panel` → `bg-surface-raised`; el resto de sus clases no cambia.

**No hacer.** Cambiar `SettingRow` ni las filas de ajustes de un request o una conexión: no
llevan grupo, y su regla es de este diálogo.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/settings packages/exchange/tests`;
`npm run ci:check` con las rutas tocadas. Con las dos apps: Ajustes muestra cajas blancas en
claro y un escalón sobre el diálogo en oscuro; Importar y Guardar en… sin gris.

### [ ] Fase 3: El aviso es una tarjeta

**Objetivo.** Un aviso mide 380, tiene radio 12, su tono en una insignia de 32, una acción como
botón secundario y el contador como píldora.

```check
contains packages/ui/src/styles/scales.css "--mandor-width-toast: 380px"
absent packages/ui/src/components/toast/Toast.tsx "w-80"
no-match packages/ui/src/components/toast/ToastItem.tsx /variant="link"/
matches packages/ui/src/components/toast/ToastItem.tsx /data-part="toast-badge"/
matches packages/ui/src/components/toast/ToastItem.tsx /data-part="toast-count"/
```

**Cambios.**

- `scales.css`: `--mandor-width-toast: 380px`; alias `--spacing-toast` en `index.css` (o la
  clave que use el `@theme` para anchos). `npm run tokens`.
- `Toast.tsx`: `VIEWPORT_STYLES` con `w-toast`.
- `ToastItem.tsx`: `ROOT_STYLES` con `rounded-overlay` y el relleno del lienzo (12 px). El glifo
  entra en `<span data-part="toast-badge">` de `size-8`, `rounded-lg`, `bg-surface-control`,
  centrado, con el color de tono en el glifo. `ToastAction` con `Button` secundario `size="sm"`.
  `ToastCount` como `<span data-part="toast-count">` píldora (`rounded-full`,
  `bg-surface-control`, `text-xs`).
- `packages/ui/tests/components/toast/ToastItem.test.tsx`: la acción es un botón por rol y
  nombre; el contador sigue diciendo `×N`.

**No hacer.** La pila (fase 4). Cambiar los textos del aviso, su duración o su urgencia.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/toast`; `npm run ci:check` con las
rutas tocadas. En `tools/ui-lab`: los cuatro tonos, con y sin acción, con `×3`.

### [ ] Fase 4: Los avisos se apilan

**Objetivo.** Con varios avisos, el más nuevo va delante y los dos anteriores asoman detrás;
con el puntero o el foco en la pila se abren en lista.

```check
matches packages/ui/src/components/toast/Toast.tsx /data-part="toast-viewport"/
contains packages/ui/src/styles/runtime.css "[data-part='toast-viewport']"
contains packages/ui/src/styles/runtime.css "translateY(-20px) scale(0.9)"
```

**Cambios.**

- `Toast.tsx`: el `Viewport` lleva `data-part="toast-viewport"`. El orden del DOM no cambia: el
  lector de pantalla los sigue leyendo en orden.
- `runtime.css`: en reposo, los avisos se superponen en la esquina; el último a la vista va en
  reposo, el penúltimo `translateY(-10px) scale(0.95)` y el anterior
  `translateY(-20px) scale(0.9)`, con `transform-origin` abajo al centro. Con
  `:hover` o `:focus-within` en el visor, vuelven a la columna con `gap-gap-control`.
  Transición de `transform` y `opacity` con `--mandor-duration-base` y `--mandor-ease-out`.
- `ToastOverflow` («N más») queda encima de la pila en los dos estados.
- Test de `Toast` en `packages/ui/tests/components/toast/`: con cinco avisos se ven tres y «2
  más»; el visor lleva su `data-part`.

**No hacer.** Cambiar cuántos avisos se ven: lo decide `visibleToasts` y no se toca.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/toast`; `npm run ci:check` con las
rutas tocadas. En `tools/ui-lab`: disparar cinco avisos, pasar el puntero, recorrerlos con
`F8` (atajo del visor de Radix); con movimiento reducido del sistema, sin animación.

### [ ] Fase 5: Menús, capas y paleta sólidos

**Objetivo.** Todo menú, capa, sugerencia, select, tooltip y la paleta dibuja un borde fino,
radio de panel y filas de control con selección gris.

```check
no-match packages/ui/src/components/menu /border-border-strong/
no-match packages/ui/src/components/popover /border-border-strong/
no-match packages/ui/src/components/menu /h-row-xs/
absent packages/ui/src/components/tooltip/Tooltip.tsx "border-border-strong"
absent packages/ui/src/components/input/SuggestList.tsx "border-border-strong"
matches packages/ui/src/components/menu/MenuItem.tsx /data-highlighted:bg-surface-selected/
```

**Cambios.**

- `MenuContent.tsx`, `ContextMenuContent.tsx`, `PopoverPanel.tsx`, `HoverCardPanel.tsx`,
  `SuggestList.tsx`, el contenido de `Select.tsx` y `CommandPalette.tsx`: `border-border-subtle`
  y `rounded-panel`; el resto igual.
- `Tooltip.tsx`: `border-border-subtle`, radio sin cambio.
- `MenuItem.tsx`, `ContextMenuItem.tsx`, las opciones de `Select` y de `SuggestList` y las filas
  de la paleta: `h-control text-sm` y `data-highlighted:bg-surface-selected`.
- Tests de menú y select que miran alturas o clases, si los hay.

**No hacer.** Cambiar contenidos, atajos u orden de ningún menú.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/menu packages/ui/tests/components/input packages/shell/tests`;
`npm run ci:check` con las rutas tocadas y `npm run design`. Con las dos apps: menú contextual
del árbol, un select de ajustes, la paleta y un tooltip, en claro y en oscuro.

### [ ] Fase 6: Acciones siempre a la vista en Orígenes y Workspaces

**Objetivo.** En las tablas de Orígenes y Workspaces las acciones de cada fila se ven siempre;
en las demás tablas siguen apareciendo con el puntero o el foco.

```check
matches packages/ui/src/components/table/TableRowActions.tsx /data-reveal/
contains packages/ui/src/styles/table.css "[data-reveal='always']"
matches packages/repos/src/components/panel/OriginRow.tsx /reveal="always"/
matches packages/workspace/src/components/panel/WorkspaceRow.tsx /reveal="always"/
matches packages/ui/tests/components/table/Table.test.tsx /reveal="always"/
```

**Cambios.**

- `TableRowActions.tsx`: `reveal?: 'hover' | 'always'` con `'hover'` por defecto, escrito en
  `data-reveal` del `td`.
- `table.css`, solo reglas añadidas después de las que hay:
  `[data-part='table'] [data-part='table-row-actions'][data-reveal='always'] { opacity: 1; }`, y
  la celda anterior de esa fila toma `--table-cell-covered` siempre, no solo con foco. Las
  reglas de hoy no se editan.
- `OriginRow.tsx` y `WorkspaceRow.tsx`: `<TableRowActions reveal="always">`.
- `Table.test.tsx`: una fila con `reveal="always"` y otra sin él; solo la primera lleva
  `data-reveal="always"`.

**No hacer.** Tocar las tablas de params, headers o variables, ni el hover de lectura.

**Cierre.** `npm run ci:test -- packages/ui/tests/components/table packages/repos/tests packages/workspace/tests`;
`npm run ci:verify` al cerrar el plan. Con las dos apps: Orígenes y Workspaces con sus botones
de fila a la vista; los headers de un request, ocultos hasta pasar el puntero.

## Deudas

Ninguna todavía.
