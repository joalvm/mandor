# Plan 03 — Request y Realtime se dibujan en tres tarjetas

## Contexto

Con el plan 02 la ventana tiene marco, pestañas flotantes y una tarjeta por pestaña. La dirección
B pide más dentro de una pestaña de trabajo: una tarjeta arriba con el destino, y debajo dos
tarjetas lado a lado separadas por el hueco del marco. Este plan lo hace en las dos apps, quita el
anillo de foco exterior que todavía queda en doce piezas, añade la densidad compacta como ajuste y
rellena los controles en vez de dibujarles borde.

Qué hay hoy:

- **Request.** `apps/sync/src/renderer/features/requests/components/panel/RequestPanel.tsx`
  apila `RequestBreadcrumb`, `RequestBar` y un `SplitPane` (`RequestSections` | `SendResponse`)
  sobre una sola superficie. `ExamplePanel.tsx:105` y `HistoryTab.tsx:36` tienen el mismo par
  request | response con su propio `SplitPane`.
- **Realtime.** `apps/async/src/renderer/features/connections/components/panel/ConnectionPanel.tsx`
  apila `ConnectionToolbar` y un `SplitPane` (`EventHalf` | `ConnectionActivity`) sobre una sola
  superficie.
- Con el plan 02, `ItemTabKind`, `LooseRequestTabKind`, `RequestExampleTabKind`,
  `ConnectionTabKind` y `HistoryTabKinds` envuelven ese cuerpo en una sola `Card`.
- **Foco.** `packages/ui/src/styles/focus.css:53` dibuja un anillo fuera de la caja
  (`box-shadow: 0 0 0 …`) para todo lo marcado con `data-focus-ring`: `NoticeRow`,
  `SidebarResizer`, `WindowButton`, `CollapsibleHeader`, `Disclosure`, `DialogNavItem`,
  `InlineNameInput`, `ListRow`, `TreeRow`, `SettingInheritanceLine`, `SplitHandle`, `TabsTab`.
  El resto de la app ya enfoca recoloreando su borde (`data-focus-frame`), y
  `tools/design/focus-ring.mjs` ya rechaza `outline` y las sombras `inset` de foco, pero no la
  sombra exterior.
- **Densidad.** No existe: `packages/schema/src/preference/preference-definitions.ts` no tiene
  ninguna preferencia de densidad, y el hueco y los radios del plan 02 son fijos.
- **Controles.** Los campos dibujan caja con borde fuerte: `FieldBox.tsx:16-17` (`outline` y
  `text`: `border-border-strong`, `text` además sobre `bg-surface-sunken`), el disparador de
  `Select.tsx:74`, `Textarea.tsx:30` y `AddressBar.tsx:27`. El botón `secondary` de
  `Button.tsx:36` es un contorno sin relleno. `InlineNameInput.tsx:89` se hunde con
  `bg-surface-sunken`. La dirección B los quiere rellenos del gris de control y sin borde.

## Decisiones base

- **Tres tarjetas, nombradas.** Cada tarjeta es una `Card` con nombre accesible: Request usa
  `requests:targetLabel` («Destino»), `requests:panelLabel` («Request», ya existe) y
  `requests:responseLabel` («Response»); Realtime usa `connections:urlLabel` (ya existe),
  `connections:message` («Mensaje», ya existe) y `connections:activityLog` («Actividad», ya
  existe). Solo nacen dos textos, en `es` y en `en`.
- **La tarjeta de arriba no se redimensiona.** Mide lo que miden la miga y la barra; el hueco la
  separa del par de abajo. El `SplitPane` del par usa `gap="gutter"` del plan 02.
- **Lo que se parte dentro de una tarjeta sigue pegado.** El `SplitPane` de `ActivityPanel.tsx:147`
  (lista y detalle de la actividad), el de `GraphqlBody.tsx`, el de `DocWriteSplit.tsx` y el de
  `SchemaIssues.tsx` siguen con `gap="none"`: son dos zonas de una misma tarjeta.
- **El foco nunca dibuja fuera de la caja.** Las doce piezas pasan a `data-focus-frame` con un
  borde de 1 px transparente en reposo, que el foco recolorea. Una pieza sin sitio para un borde
  (el asa de split, el redimensionador del lateral) recolorea su propia línea. El chequeo de
  diseño rechaza desde entonces cualquier `box-shadow: 0 0 0` en una regla de foco.
- **La densidad es una preferencia de apariencia.** `appearance.density`, `select` con
  `comfortable` (por defecto) y `compact`, en la sección `themes`. Se escribe en
  `data-density` del documento igual que `data-theme`, antes del primer pintado. Compacta pone el
  hueco y el radio de panel a 0, la tira a 32, la pestaña a 30 sin radio, y vuelve a separar las
  zonas con líneas: es la rejilla pegada de hoy, como opción.
- **Un control se rellena; no se enmarca.** Campo, desplegable, área de texto, barra de dirección
  y botón secundario: `bg-surface-control`, un paso más al apuntar (`surface-control-hover`) y
  borde de 1 px transparente, que el foco recolorea (`data-focus-frame`) y el error pinta
  (`border-border-error`). Sobre el marco (el buscador del lateral) el relleno es el de la
  tarjeta, para que no se funda con lo que lo rodea. La costura entre método y dirección se
  queda: es la única línea dentro de un control.

## No entra aquí

- Diálogos, avisos, menús, tooltips, paleta y las tablas de Orígenes y Workspaces: plan 04.
- `Table` y `table.css`: cerrados.

## Librerías antes que código

| Pieza            | Candidata                                 | Decisión                                                         |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Tarjetas y hueco | `Card` y `SplitPane` del plan 02          | Se usan tal cual; nada nuevo                                     |
| Foco             | `focus.css` y `data-focus-frame` del repo | El mecanismo ya existe; solo se retira el anillo exterior        |
| Densidad         | Preferencias propias (`@mandor/prefs`)    | Una definición más y un atributo del documento; ninguna librería |

El plan no añade dependencias.

## Las dos apps

| Pieza                     | Dónde vive                                         | Quién la usa    |
| ------------------------- | -------------------------------------------------- | --------------- |
| Tres tarjetas de Request  | `apps/sync/src/renderer/features/requests/`        | Mandor Request  |
| Tres tarjetas de Realtime | `apps/async/src/renderer/features/connections/`    | Mandor Realtime |
| Foco sin anillo           | `packages/ui`, `packages/shell`                    | las dos         |
| Densidad                  | `packages/schema`, `packages/prefs`, `packages/ui` | las dos         |
| Controles rellenos        | `packages/ui`                                      | las dos         |

Las tarjetas de cada app se quedan en su app por la fila «Lado derecho» de la tabla de
diferencias de `mandor.md`: respuesta directa en Request, actividad de la conexión en Realtime.
La forma (destino arriba, dos tarjetas abajo) es la misma; lo que va dentro no.

## Criterios de entrada

Nada nuevo aspira a `packages/`: las tarjetas son de cada app y la densidad amplía paquetes que ya
existen.

### [x] Fase 1: Request en tres tarjetas

**Objetivo.** Una pestaña de request muestra el destino en una tarjeta arriba y el request y su
response en dos tarjetas abajo, con el hueco del marco entre las tres.

```check
matches apps/sync/src/renderer/features/requests/components/panel/RequestPanel.tsx /<Card/
matches apps/sync/src/renderer/features/requests/components/panel/RequestPanel.tsx /gap="gutter"/
matches apps/sync/src/renderer/features/requests/components/examples/ExamplePanel.tsx /gap="gutter"/
matches apps/sync/src/renderer/features/history/components/tab/HistoryTab.tsx /gap="gutter"/
matches packages/i18n/src/lang/es/requests.json /"targetLabel": "Destino"/
matches packages/i18n/src/lang/es/requests.json /"responseLabel": "Response"/
```

**Cambios.**

- `RequestPanel.tsx`: la raíz deja de pintar superficie y pasa a una columna con
  `gap-gap-gutter`. Arriba, `<Card aria-label={labels('targetLabel')}>` con `RequestBreadcrumb` y
  `RequestBar`, sin crecer. Abajo, el `SplitPane` con `gap="gutter"`; cada `SplitHalf` envuelve
  su contenido en una `Card` (`panelLabel` y `responseLabel`).
- `ExamplePanel.tsx` y `HistoryTab.tsx`: el mismo reparto, con lo que cada uno tenga arriba.
- `LooseRequestTabKind.tsx`, `RequestExampleTabKind.tsx` y `HistoryTabKinds.tsx` quitan la `Card`
  que les puso el plan 02: el panel lleva las suyas. El cuerpo de request que registra la app
  para `ItemTabKind` hace lo mismo; si `ItemTabKind` sigue envolviendo en `Card` para todas las
  hojas, la hoja de request se registra sin ella (la tarjeta la pone la hoja, no la pestaña).
- `requests.json` en `es` y en `en`: `targetLabel` y `responseLabel`. `npm run i18n`.
- Tests de `apps/sync/tests/unit-dom/` del panel: las tres tarjetas por rol `region` y su nombre.

**No hacer.** Tocar Realtime (fase 2) ni el foco (fase 3).

**Cierre.** `npm run ci:test -- apps/sync/tests/unit-dom/features/requests apps/sync/tests/unit-dom/features/history`;
`npm run ci:check` con las rutas tocadas. Con `npm run dev:sync`: un request de colección, uno
suelto, un ejemplo y una entrada del historial muestran las tres tarjetas; arrastrar el asa del
par mueve solo el par.

### [x] Fase 2: Realtime en tres tarjetas

**Objetivo.** Una pestaña de conexión muestra la conexión en una tarjeta arriba y el mensaje y la
actividad en dos tarjetas abajo.

```check
matches apps/async/src/renderer/features/connections/components/panel/ConnectionPanel.tsx /<Card/
matches apps/async/src/renderer/features/connections/components/panel/ConnectionPanel.tsx /gap="gutter"/
matches apps/async/src/renderer/features/connections/components/panel/ConnectionPanel.tsx /activityLog/
```

**Cambios.**

- `ConnectionPanel.tsx`: igual que Request. Arriba `<Card aria-label={messages('urlLabel')}>`
  con `ConnectionToolbar`; abajo el `SplitPane` con `gap="gutter"`, `EventHalf` en una `Card`
  (`message`) y `ConnectionActivity` en otra (`activityLog`).
- `ConnectionTabKind.tsx` quita la `Card` del plan 02.
- El `SplitPane` de `apps/async/src/renderer/activity/components/panel/ActivityPanel.tsx` se
  queda sin hueco, dentro de su tarjeta.
- Tests de `apps/async/tests/unit-dom/` del panel: las tres tarjetas por rol y nombre.

**No hacer.** Cambiar lo que dibuja la actividad, ni el detalle del marco.

**Cierre.** `npm run ci:test -- apps/async/tests/unit-dom/features/connections`;
`npm run ci:check` con las rutas tocadas. Con `npm run dev:async`: una conexión abierta, enviar un
mensaje y ver la actividad en su tarjeta.

### [x] Fase 3: El foco nunca dibuja fuera de la caja

**Objetivo.** Ninguna pieza de la ventana dibuja un anillo de foco por fuera: todas recolorean su
borde o su línea, y el chequeo de diseño impide volver al anillo.

```check
absent packages/ui/src/styles/focus.css "[data-focus-ring]"
no-match packages/ui /data-focus-ring/
no-match packages/shell/src /data-focus-ring/
no-match tools/ui-lab/src /data-focus-ring/
contains tools/design/focus-ring.mjs "0 0 0"
matches tools/tests/design/design-rules.test.mjs /box-shadow: 0 0 0/
```

**Cambios.**

- `focus.css`: se borra la regla `[data-focus-ring]:focus-visible`. `--focus-ring-width` se
  queda si algo más la lee; si no, sale de `semantic.css`, `semantic-dark.css` y
  `semantic-contrast.css`, y `npm run tokens` la quita de `token-*-values.ts`.
- Las doce piezas pasan de `data-focus-ring` a `data-focus-frame`. Las que no tienen borde ganan
  `border border-transparent` sin cambiar de tamaño (el borde entra en su caja). `SplitHandle` y
  `SidebarResizer` recolorean la línea que ya pintan (`before:`) al enfocarse, con
  `--focus-ring`; nada más.
- `InlineNameInput.test.tsx` y `tools/ui-lab` (`foco-page.tsx`, `page-outline.tsx`,
  `shell-header.tsx`, `shell-search.tsx`, `shell-sidebar.tsx`, `senales-tokens.ts`) dejan de nombrar
  el atributo viejo.
- `tools/design/focus-ring.mjs`: un problema nuevo para una regla con `focus` en el selector cuya
  sombra abre con `0 0 0` (anillo exterior), con el mismo mensaje que ya da para `outline`. Su
  caso en `tools/tests/design/design-rules.test.mjs`.

**No hacer.** Cambiar el color de foco ni la regla `quiet`: son de `focus.css` y siguen igual.

**Cierre.** `npm run ci:test -- tools/tests/design packages/ui/tests/components/input`; luego
`npm run ci:check` con las rutas tocadas y `npm run design`. Con la app: recorrer con Tab el
lateral, las filas del árbol, las pestañas internas de un request, el asa del split y los botones
de ventana; ningún contorno sale de su caja.

### [x] Fase 4: Densidad compacta como ajuste

**Objetivo.** En Ajustes → Temas, «Densidad» elige entre cómoda y compacta; compacta pega las
tarjetas sin hueco ni radio y vuelve a separar las zonas con líneas.

```check
contains packages/schema/src/preference/preference-definitions.ts "appearance.density"
matches packages/i18n/src/lang/es/preferences.json /"appearance-density-compact": "Compacta"/
matches packages/prefs/src/preferences-application.tsx /dataset\['density'\]/
contains packages/ui/src/styles/scales.css "[data-density='compact']"
```

**Cambios.**

- `preference-definitions.ts`: `appearance.density`, `select`, `values: ['comfortable', 'compact']`,
  `defaultValue: 'comfortable'`, `scope: 'app'`, `section: 'themes'`, con `labelKey` y `helpKey`.
- `preferences.json` en `es` y `en`: `density` («Densidad»), `densityHelp` («Compacta pega los
  paneles y quita el hueco entre ellos.»), `appearance-density-comfortable` («Cómoda»),
  `appearance-density-compact` («Compacta»). `npm run i18n`.
- `preferences-application.tsx`: un `useLayoutEffect` como el del tema escribe
  `root.dataset['density']` y lo quita al desmontar.
- `scales.css`: un bloque `:root[data-density='compact']` con `--mandor-gap-gutter: 0px`,
  `--mandor-radius-panel: 0px`, `--mandor-height-strip: 32px`, `--mandor-height-grid-tab: 30px` y,
  como el canvas, `--mandor-height-row: 22px`. La lista virtual lee la fila de la ventana
  (`useRowHeight`) y no del valor generado, que es el de la cómoda.
  `grid.css`: con compacta, la pestaña sin radio y la tira con su línea de abajo; `runtime.css`:
  dos `Card` contiguas se separan con `border-subtle`. Es lo único que la compacta añade.
- `ThemePreview.tsx` no cambia: la vista previa enseña el tema, no la densidad.
- Tests: de la definición en `packages/schema/tests/`, del atributo en `packages/prefs/tests/`, y
  de los tokens en `packages/ui/tests/styles/` (que `token-scale-values.ts` siga siendo el de la
  cómoda).

**No hacer.** Una densidad por app o por pestaña, ni más de dos valores.

**Cierre.** `npm run ci:test -- packages/schema/tests packages/prefs/tests packages/ui/tests/styles`;
`npm run ci:check` con las rutas tocadas. Con las dos apps: cambiar a compacta y ver la rejilla
pegada con líneas; volver a cómoda; reiniciar la app y que se conserve.

### [x] Fase 5: Los campos toman el fondo de su padre y el botón secundario se rellena

**Objetivo.** Campos, desplegables, áreas de texto, la barra de dirección y el nombre en sitio
dibujan su línea sobre el fondo de lo que los contiene: blancos en una tarjeta blanca, grises en
el gris del lateral. El botón secundario es un relleno gris sin contorno. El foco y el error
siguen recoloreando la línea.

Desviación del canvas, decidida por el usuario: el canvas rellena los campos de gris sin borde;
aquí todo campo lleva borde y el fondo de su padre, como antes. El secundario sí sigue al canvas
(`--ctl-a`). `surface-raised` oscuro sigue igual al relleno de control, como en el canvas: el
puntero es lo que separa un control de un menú.

```check
contains packages/ui/src/components/input/FieldBox.tsx "text: 'border-border-strong bg-transparent hover:border-border-hover'"
absent packages/ui/src/components/input/FieldBox.tsx "bg-surface-sunken"
absent packages/ui/src/components/input/Select.tsx "bg-surface-sunken"
absent packages/ui/src/components/input/AddressBar.tsx "bg-surface-sunken"
absent packages/ui/src/components/button/Button.tsx "'border-border-strong bg-transparent"
absent packages/ui/src/components/input/InlineNameInput.tsx "bg-surface-sunken"
matches packages/ui/tests/styles/contrast.test.ts /filled control/
```

**Cambios.**

- `FieldBox.tsx`: `text` y `search` (antes `outline`, solo `SearchInput`) pasan a
  `border-border-strong bg-transparent hover:border-border-hover`; `search` conserva el foco
  callado. `invalid` y `disabled` no cambian.
- `Select.tsx` (`TRIGGER_BOX`) y `AddressBar.tsx`: `bg-transparent` en vez de `bg-surface-sunken`.
  `Textarea.tsx` ya era transparente. `InlineNameInput.tsx`: línea `border-border-strong` y
  `bg-transparent`.
- `Button.tsx`: `secondary` pasa a `border-transparent bg-surface-control-active`, hover
  `bg-surface-control-hover`; `disabled` sin borde.
- `surface-sunken` se queda: lo pintan otros.
- `contrast.test.ts`: caso «filled control»: `surface-control` y `-hover` distintos de
  `surface-card` en cada modo, y `-hover` distinto de `surface-raised`.
- Tests: `Select.test.tsx`, `SearchInput.test.tsx`, `InlineNameInput.test.tsx`, un caso en
  `FieldBox.test.tsx` y otro en `controls.test.tsx`.

**No hacer.** Tocar `Table` ni `table.css`, los menús y popovers (plan 04), el foco (fase 3) ni
la casilla y el interruptor.

**Cierre.** `npm run ci:test -- packages/ui/tests/components packages/ui/tests/styles`; con las
dos apps en claro y oscuro: la barra de dirección, el buscador del lateral y el de actividad se
leen como línea sobre su fondo; Tab recolorea su línea sin moverlos.

### [x] Fase 6: La tarjeta de destino mide como el canvas

**Objetivo.** La dirección y su acción principal miden 34 px. En Request, la tarjeta de destino
lleva una fila de miga de 30 px con sus iconos (código, guardar, más) y la fila de la dirección;
en Realtime, una sola fila de 48 px con la dirección y sus botones.

```check
contains packages/ui/src/styles/scales.css "--mandor-height-address: 34px"
contains packages/ui/src/styles/index.css "--spacing-address"
matches packages/ui/src/components/input/AddressBar.tsx /h-address/
```

**Cambios.**

- `scales.css`: token `--mandor-height-address: 34px`; alias `--spacing-address` en `index.css`;
  `npm run tokens`.
- `AddressBar.tsx`: `h-address`. El botón Enviar/Conectar a la misma altura.
- Request: fila de miga de 30 px; a su derecha, código, guardar el response (si hay uno) y «Más
  acciones», que abre el menú de la fila del árbol del request (sin él en un request suelto). La
  dirección pierde esos iconos; método de 84 px de ancho.
- Realtime: fila de 48 px; dentro de la dirección, una pastilla con el estado y el tiempo
  conectada. La fila termina en Conectar. Grabar pasa a la cabecera de Actividad, como botón de
  icono con su tooltip, sin texto. Sin «Más acciones» en la barra.
- La tira de pestañas de las dos apps cierra con dividir el grupo a la derecha y la lista de
  pestañas, como el `strip-tail` del canvas.
- Las dos apps.

**No hacer.** Tocar las tarjetas del par (fases 1 y 2) ni los campos (fase 5).

**Cierre.** `ci:test` de los paquetes tocados; las dos apps en claro, oscuro y compacta contra el
canvas `Main` y `Realtime`.

### [x] Fase 7: Cabeceras en tipo frase con conteo

**Objetivo.** Las cabeceras de sección del lateral y la de la actividad se escriben en tipo
frase, 12 px y 600, con su conteo en gris al lado, sin mayúsculas ni línea entre secciones.

```check
absent packages/ui/src/components/collapsible/CollapsibleHeader.tsx "uppercase"
absent apps/async/src/renderer/activity/components/panel/ActivityHead.tsx "uppercase"
matches packages/ui/src/components/collapsible/CollapsibleHeader.tsx /count/
```

**Cambios.**

- `CollapsibleHeader.tsx`: 28 px, `text-xs font-semibold`, sin `uppercase` ni `tracking-wide`;
  prop `count` opcional pintada en `text-text-tertiary`.
- Las secciones del lateral pasan su conteo; sin línea entre secciones.
- `ActivityHead.tsx`: «Actividad», el conteo y la meta de bytes a la derecha.
- Las dos apps.

**No hacer.** Cambiar qué secciones hay ni su orden.

**Cierre.** `ci:test` de los paquetes tocados; las dos apps en claro y oscuro contra el canvas.

### [x] Fase 8: Renombrar en blanco y sin foco de color

**Objetivo.** El campo de renombrar en sitio (docs, colecciones, conexiones) es blanco y no
pinta foco: ni su línea ni la fila que lo lleva se recolorean con el acento. Las filas de lista y
de árbol y las pestañas tampoco dibujan línea de foco.

```check
absent packages/ui/src/components/input/InlineNameInput.tsx "data-focus-frame"
absent packages/ui/src/components/input/InlineNameInput.tsx "bg-transparent"
absent packages/ui/src/components/row/TreeRow.tsx "data-focus-frame"
absent packages/ui/src/components/row/ListRow.tsx "data-focus-frame"
absent packages/ui/src/components/tabs/TabsTab.tsx "data-focus-frame"
```

**Cambios.**

- `InlineNameInput.tsx`: fondo blanco siempre (la superficie de tarjeta), su línea gris quieta
  con el foco; es la excepción a la regla de la fase 5 de que un campo toma el fondo del padre.
- `TreeRow.tsx`, `ListRow.tsx`, `TabsTab.tsx` y las pestañas de la tira: sin `data-focus-frame`.
  La fila o la pestaña con el foco del teclado se distinguen por su gris de seleccionado, nunca
  por una línea.
- Las dos apps.

**No hacer.** Tocar el foco de botones, campos y la barra de dirección.

**Cierre.** `ci:test` de los paquetes tocados; renombrar un doc, una colección y una conexión en
las dos apps, en claro y oscuro.

### [x] Fase 9: Las tarjetas llevan un borde tenue

**Objetivo.** Cada tarjeta se cierra con una línea de 1 px en `--color-border-subtle`, en claro y
en oscuro: sin ella la tarjeta no termina de leerse sobre el marco. Es decisión del usuario y se
aparta del canvas, que las deja sin borde.

```check
matches packages/ui/src/styles/runtime.css /\[data-part='card'\] \{\s*border: 1px solid var\(--color-border-subtle\)/
```

**Cambios.**

- `runtime.css`: `[data-part='card']` con el borde; en densidad compacta el borde se va y quedan
  las líneas que ya separan las tarjetas que se tocan.
- Las dos apps.

**No hacer.** Cambiar el tono de la tarjeta o del marco, ni el radio.

**Cierre.** `ci:test` de `ui`; las dos apps en claro, oscuro y compacta.

## Deudas

Ninguna todavía.
