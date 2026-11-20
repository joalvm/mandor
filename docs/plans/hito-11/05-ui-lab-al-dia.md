# Plan 05 — El ui-lab enseña el diseño que las apps ya tienen

## Contexto

Los planes 02, 03 y 04 rehicieron la ventana de las dos apps: marco, tarjetas con borde tenue,
estados en gris, capas sólidas, densidad compacta y la preferencia Animaciones. El ui-lab
(`tools/ui-lab/`, `npm run dev:lab`) monta los componentes reales de `@mandor/ui`, así que las
demos que solo usan componentes ya salen bien. Lo que el lab dibuja por su cuenta, y la prosa que
escribe a mano, se quedaron en el diseño anterior:

- **Marco del lab.** `shell/shell-header.tsx:37` pinta la cabecera en `bg-surface-app` con borde
  inferior, y la sección abierta lleva una raya de acento (`SECTION_CLASSES`, línea 16).
  `shell/shell-sidebar.tsx:15` tiñe la página abierta de acento (`bg-surface-accent-tint
text-text-accent`). `shell/shell-content.tsx:9` pinta el contenido directo sobre
  `bg-surface-app`: no hay marco ni tarjeta. El buscador (`shell/shell-search.tsx:115`) abre su
  lista en gris de panel con `rounded-md`. El menú de tema (`shell/theme-menu.tsx`) solo cambia
  el tema: no hay forma de ver la densidad compacta ni las animaciones reducidas.
- **Piezas.** `pieces/demo.tsx:72` enmarca cada demo en `rounded-xl` con una banda gris
  (`bg-surface-panel`, línea 75) y el lienzo en `bg-surface-app`. `pieces/doc-page.tsx:36` pinta
  la sección encima del titular en acento. `pieces/token-previews.tsx` elige la muestra con un
  `switch` (línea 94) y dibuja alturas y anchos en `bg-solid-accent`.
- **Tokens escritos a mano.** Las notas de las tablas repiten el valor en píxeles y ya mienten:
  `foundations/alturas/alturas-page.tsx:26` dice que `--mandor-height-row` mide 28 px y
  `scales.css:46` dice 24. Faltan tokens que las apps usan: alturas `grid-tab`, `strip`,
  `control-dialog`, `crumb`, `address`, `toolbar`; anchos `toast`, `command-center`, `tab`,
  `tab-min`, `handle`; `--mandor-gap-gutter` en Espaciado; las duraciones `exit` y `travel` y los
  tokens `--mandor-motion-*` en Movimiento. `foundations/radios/radios-page.tsx:60` titula «Los
  seis» y lista ocho.
- **Superficies sueltas.** Quince archivos de demos pintan gris de panel donde las apps ya pintan
  tarjeta o capa (`grep bg-surface-panel tools/ui-lab/src`): barras de dirección, migas, paneles
  de split, la lista compacta de métodos, el árbol y la caja de importar
  (`blocks/exchange/import-demo.tsx:19`, con `border-border-strong`, y su insignia en acento en
  la línea 41).
- **Componentes sin página.** `Card`, `Table` (con `reveal`), `SettingsGroup`/`SettingRow`,
  `HoverCard` y `SuggestList` se exportan desde `@mandor/ui` y no tienen página
  (`nav/pages-components.ts`).
- **Prosa que contradice el diseño.** `blocks/settings/settings-page.tsx:85` y
  `foundations/foco/foco-page.tsx:77` ponen el acento en la selección; los estados son gris.
  `components/dialog/dialog-page.tsx:143` da el diálogo de secciones en 800 × 480, y
  `scales.css:64-65` lo mide 880 × 700.

## Decisiones base

- **El lab se dibuja como las apps.** Cabecera y lateral viven en el marco
  (`bg-surface-frame`), sin línea entre ellos; el contenido va en una `Card` con el hueco
  `gap-gutter` a la derecha y abajo, como `AppBody` y `Workbench`. Lo que desplaza es la tarjeta,
  no la ventana.
- **Estados en gris también aquí.** La sección y la página abiertas se marcan con
  `bg-surface-selected text-text-primary`, sin raya ni tinte de acento. Los enlaces de la prosa
  siguen en acento: son acciones.
- **El lab enseña las tres preferencias de apariencia.** El menú de tema pasa a «Apariencia» con
  tema, densidad y animaciones, y escribe en la raíz los mismos atributos que
  `PreferencesApplication` (`data-theme`, `data-density`, `data-motion`). Un token que cambia con
  la densidad se ve cambiar en el lab.
- **El valor de un token lo lee la página, no lo escribe nadie.** `TokenTable` gana la columna
  «Valor», leída de `getComputedStyle(document.documentElement)` y releída cuando cambia un
  atributo de apariencia de la raíz. Las notas dicen para qué existe el token, nunca cuánto mide.
- **La escala tipográfica del lab se queda** (`--text-lab-*` en `lab.css`): es la de una página
  de documentación, y las apps no la usan.
- **El lienzo de una demo es la tarjeta.** `Demo` se enmarca como una `Card`
  (`rounded-panel`, borde tenue, `bg-surface-card`), sin banda gris; la barra «Vista / Código» se
  queda sin fondo propio. `ground?: 'card' | 'frame'`, por defecto `'card'`, para las piezas que
  en la app viven en el marco (tira de pestañas, barra de título).

## No entra aquí

- Los componentes de `packages/ui`: el lab los enseña como son. Lo que salga mal en una demo y
  sea del componente va a Deudas, no a este plan.
- El canvas de diseño: es la referencia, no se toca.
- Páginas para el armazón de las apps (`AppShell`, `TitleBar`, `StatusBar`, `Workbench`,
  `SidePanel`): el propio lab enseña el marco y la tarjeta; el armazón entero solo tiene sentido
  dentro de Electron.

## Librerías antes que código

| Pieza                              | Candidata                                                     | Decisión                                                        |
| ---------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Releer el valor al cambiar la raíz | `MutationObserver` + `useSyncExternalStore` (runtime y React) | Entra: las dos son de la plataforma; ninguna dependencia nueva. |
| Menú de apariencia                 | `Menu` de `@mandor/ui`                                        | Entra: el mismo menú `checkable` que ya usa `theme-menu.tsx`.   |

El plan no añade dependencias.

## Las dos apps

| Pieza        | Dónde vive      | Quién la usa                                                                     |
| ------------ | --------------- | -------------------------------------------------------------------------------- |
| Todo el plan | `tools/ui-lab/` | El lab; enseña lo que `@mandor/ui` da a las dos apps, sin tocar ninguna de ellas |

## Criterios de entrada

Nada aspira a `packages/`. El lab es una herramienta: lo que escribe vive en `tools/ui-lab/` y
no lo importa ninguna app.

### [x] Fase 1: El lab se dibuja en un marco con su contenido en una tarjeta

**Objetivo.** Abrir el lab y ver el mismo marco que las apps, con estados en gris, y poder
cambiar tema, densidad y animaciones desde la cabecera.

```check
contains tools/ui-lab/src/shell/lab-shell.tsx "bg-surface-frame"
absent tools/ui-lab/src/shell/shell-header.tsx "bg-surface-app"
absent tools/ui-lab/src/shell/shell-header.tsx "bg-solid-accent"
absent tools/ui-lab/src/shell/shell-sidebar.tsx "bg-surface-accent-tint"
contains tools/ui-lab/src/shell/shell-content.tsx "Card"
absent tools/ui-lab/src/shell/shell-search.tsx "bg-surface-panel"
absent tools/ui-lab/src/pieces/doc-page.tsx "text-text-accent"
contains tools/ui-lab/src/theme.ts "density"
contains tools/ui-lab/src/theme.ts "motion"
```

**Cambios.**

- `shell/lab-shell.tsx`: el marco entero en `bg-surface-frame`.
- `shell/shell-header.tsx`: sin `border-b` ni `bg-surface-app`; la sección abierta con
  `bg-surface-selected text-text-primary` y `rounded-md`, la raya `after:` fuera.
- `shell/shell-sidebar.tsx`: sin `border-r`; `ENTRY_CLASSES.current` en gris.
- `shell/shell-body.tsx` y `shell/shell-content.tsx`: el contenido dentro de `Card`, con
  `pr-gap-gutter pb-gap-gutter` en el cuerpo; el desplazamiento vertical pasa a la tarjeta.
- `shell/shell-search.tsx`: la lista como capa (`rounded-panel border-border-subtle
bg-surface-raised shadow-popover`), igual que `SuggestList`.
- `theme.ts`: densidad (`comfortable` | `compact`) y animaciones (`system` | `full` |
  `reduced`) junto al tema, con la misma forma de leer, guardar y aplicar.
- `shell/theme-menu.tsx`: un menú «Apariencia» con los tres grupos; `lab-app.tsx` guarda las tres
  elecciones.
- `pieces/doc-page.tsx`: la sección encima del titular en `text-text-secondary`.

**No hacer.** Tocar `Demo` ni las tablas de tokens: fases 2 y 3.

**Cierre.** `npx prettier --write tools/ui-lab/src` y `npm run ci:check -- tools/ui-lab/src`.
`npm run dev:lab`: claro, oscuro y compacto; la página abierta y la sección en gris; el contenido
desplaza dentro de la tarjeta.

### [ ] Fase 2: Las tablas de tokens leen su valor y nombran todos los tokens

**Objetivo.** Cada token de la escala aparece en su página con el valor que el navegador
calcula, y ese valor cambia al pasar a compacto.

```check
file tools/ui-lab/src/pieces/use-root-appearance.ts
contains tools/ui-lab/src/pieces/token-table.tsx "Valor"
absent tools/ui-lab/src/pieces/token-previews.tsx "switch ("
absent tools/ui-lab/src/pieces/token-previews.tsx "bg-solid-accent"
no-match tools/ui-lab/src/foundations /note: '[0-9]+ px/
contains tools/ui-lab/src/foundations/alturas/alturas-page.tsx "--mandor-height-strip"
contains tools/ui-lab/src/foundations/alturas/alturas-page.tsx "--mandor-width-toast"
contains tools/ui-lab/src/foundations/espaciado/espaciado-page.tsx "--mandor-gap-gutter"
contains tools/ui-lab/src/foundations/movimiento/movimiento-page.tsx "--mandor-motion-scale-overlay"
contains tools/ui-lab/src/foundations/radios/radios-page.tsx "Los ocho"
```

**Cambios.**

- `pieces/use-root-appearance.ts`: `useSyncExternalStore` sobre un `MutationObserver` de los
  atributos `data-theme`, `data-density` y `data-motion` de la raíz; devuelve la combinación
  actual para que quien lea un valor calculado se vuelva a pintar.
- `pieces/token-table.tsx`: columna «Valor» entre «Variable» y «Utilidad», con el valor calculado.
- `pieces/token-previews.tsx`: la muestra se elige por tabla (`Record<TokenPreview, …>`), sin
  `switch`; alturas y anchos en un relleno neutro, sin acento; `ValuePreview` lee con el hook.
- `foundations/*`: notas sin píxeles; alturas, anchos, huecos y movimiento con los tokens que
  faltan (lista en Contexto); Radios titula «Los ocho» y la regla del lienzo deja de citar
  `rounded-xl`.

**No hacer.** Repintar demos fuera de `foundations/`: fase 3.

**Cierre.** `npx prettier --write tools/ui-lab/src` y `npm run ci:check -- tools/ui-lab/src`.
`npm run dev:lab`: Alturas en cómoda y compacta, `--mandor-height-strip` pasa de 38 a 32 sin
recargar.

### [ ] Fase 3: Demos y piezas sobre tarjeta, sin gris de panel

**Objetivo.** Cada demo se ve sobre la superficie donde la pieza vive en la app: tarjeta para el
contenido, marco para el cromo, capa para lo que flota.

```check
contains tools/ui-lab/src/pieces/demo.tsx "rounded-panel"
absent tools/ui-lab/src/pieces/demo.tsx "bg-surface-panel"
contains tools/ui-lab/src/pieces/demo.tsx "ground"
no-match tools/ui-lab/src/components /bg-surface-panel/
no-match tools/ui-lab/src/blocks /bg-surface-panel|border-border-strong|bg-surface-accent-tint/
no-match tools/ui-lab/src/pieces /rounded-xl|bg-surface-panel|border-border-strong/
```

**Cambios.**

- `pieces/demo.tsx`: marco de tarjeta, barra sin fondo, lienzo en `bg-surface-card` y
  `ground?: 'card' | 'frame'` (`'card'` por defecto, escrito en la llamada donde sea `'frame'`).
- `components/tabs/*`: las demos de la tira con `ground="frame"`.
- `components/address-bar/{conexion,peticion}.tsx`, `components/panel/migas.tsx`,
  `components/split-pane/paneles.tsx`, `components/method-mark/compacto.tsx`: sin fondo propio;
  la tarjeta de la demo es la superficie.
- `blocks/exchange/exchange-tree.tsx` e `import-demo.tsx`: árbol y caja en `bg-surface-raised`
  con `border-border-subtle`, como `ChoiceTree` e `ImportDropzone`; la insignia de archivo en
  `bg-surface-control text-text-secondary`.
- `pieces/token-previews.tsx`: bordes de muestra en `border-border-subtle`; la sombra sobre
  `bg-surface-card`.
- `foundations/{espaciado/composicion,foco/foco-page,iconografia/iconografia-page,movimiento/transiciones,tema/dos-temas,overview/overview-page}.tsx`:
  la caja de ejemplo en `bg-surface-card`; el ejemplo de prosa de Overview nombra
  `bg-surface-card`.

**No hacer.** Cambiar prosa de reglas: fase 5.

**Cierre.** `npx prettier --write tools/ui-lab/src` y `npm run ci:check -- tools/ui-lab/src`.
`npm run dev:lab`: recorrer Componentes y Bloques en claro, oscuro y compacto.

### [ ] Fase 4: Card, Table, SettingsGroup, HoverCard y SuggestList tienen su página

**Objetivo.** Los cinco componentes de `@mandor/ui` que las apps montan y el lab no enseñaba se
pueden mirar, con sus estados, en Componentes.

```check
file tools/ui-lab/src/components/card/card-page.tsx
file tools/ui-lab/src/components/table/table-page.tsx
file tools/ui-lab/src/components/settings-group/settings-group-page.tsx
file tools/ui-lab/src/components/hover-card/hover-card-page.tsx
file tools/ui-lab/src/components/suggest-list/suggest-list-page.tsx
contains tools/ui-lab/src/nav/pages-components.ts "TablePage"
matches tools/ui-lab/src/components/table /reveal="always"/
```

**Cambios.**

- `components/card/`: tarjetas sobre el marco con el hueco del marco; una sola tarjeta por
  zona, nunca anidada; qué hace la densidad compacta.
- `components/table/`: tabla de campos (acciones al apuntar, filas quietas) frente a tabla de
  listado (`reveal="always"`), columnas que se arrastran y `TableTools`.
- `components/settings-group/`: la lista sin caja de los ajustes, con `SettingRow` y `Switch` a
  la derecha.
- `components/hover-card/` y `components/suggest-list/`: la capa sólida, sus líneas a altura de
  control y el teclado.
- `nav/pages-components.ts`: las cinco en orden alfabético.

**No hacer.** Rehacer páginas existentes: fase 5.

**Cierre.** `npx prettier --write tools/ui-lab/src` y `npm run ci:check -- tools/ui-lab/src`.
`npm run dev:lab`: las cinco páginas en claro, oscuro y compacto, con teclado.

### [ ] Fase 5: La prosa de capas, diálogos, avisos y ajustes dice lo que hay

**Objetivo.** Ninguna página del lab contradice a las apps: medidas, superficies, acento y
movimiento de lo que flota, tal como quedaron.

```check
absent tools/ui-lab/src/components/dialog/dialog-page.tsx "800 × 480"
absent tools/ui-lab/src/blocks/settings/settings-page.tsx "foco, selección y acción primaria"
absent tools/ui-lab/src/foundations/foco/foco-page.tsx "foco, selección, activo y primario"
contains tools/ui-lab/src/foundations/movimiento/movimiento-page.tsx "data-motion"
contains tools/ui-lab/src/components/toast/toast-page.tsx "380"
```

**Cambios.**

- `components/dialog/dialog-page.tsx`: medidas leídas de `scales.css` (880 × 700 el de
  secciones), una superficie, control de 32 en el diálogo.
- `components/toast/toast-page.tsx`: tarjeta de 380, pila de tres que se abre al apuntar.
- `components/{menu,context-menu,popover,select,tooltip}/*-page.tsx`: capa sólida con borde
  tenue, líneas a altura de control, sin contorno al recorrerlas con teclado.
- `blocks/settings/settings-page.tsx` y `foundations/foco/foco-page.tsx`: el acento solo en
  foco, acción primaria, lo encendido y la marca; los estados en gris.
- `foundations/movimiento/movimiento-page.tsx`: la preferencia Animaciones (`data-motion`), qué
  quita `reduced` y qué conserva.

**No hacer.** Tocar componentes de `packages/ui`.

**Cierre.** `npx prettier --write tools/ui-lab/src` y `npm run ci:verify`. `npm run dev:lab`:
recorrer las páginas tocadas en claro, oscuro y compacto.

## Deudas

Ninguna todavía.
