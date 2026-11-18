# Tokens

Capas, nombres, escalas y temas.

## Capas

| Capa       | Contiene                                  | Ejemplo                                             | La usa                 |
| ---------- | ----------------------------------------- | --------------------------------------------------- | ---------------------- |
| Primitiva  | valores crudos: rampas, escalas           | `gray-3`, `space-4`, `radius-3`                     | solo la capa semántica |
| Semántica  | significado                               | `surface-raised`, `text-secondary`, `border-subtle` | los componentes        |
| Componente | ajuste propio de una pieza, si hace falta | `field-border-focus`                                | esa pieza              |

- Los componentes usan **solo semánticos**. Ningún hex, ningún píxel, ningún valor arbitrario
  fuera de las hojas de tokens.
- El tema cambia en la capa semántica; las primitivas no saben de temas.
- Un token de componente existe solo cuando la pieza necesita afinarse aparte; si no, sobra.
- **Se elige por significado, nunca porque «se ve igual»**: en otro tema dejará de verse igual.
- Una sola fuente genera las hojas; lo generado se comprueba contra la fuente en cada verificación.
- Cada token documenta su propósito. Uno que ya no se usa se retira; uno en duda se marca antes
  de borrarlo.

## Nombres

`propiedad-rol-variante-estado`, de lo general a lo particular; el rol por defecto no lleva
modificador.

| Familia    | Roles                                                                 |
| ---------- | --------------------------------------------------------------------- |
| superficie | app, panel, sunken, raised, overlay, control, selected; hover, active |
| texto      | primary, secondary, tertiary, disabled, on-accent, accent             |
| borde      | subtle, strong, focus                                                 |
| acento     | solid, solid-hover, soft, soft-hover                                  |
| estado     | error, warning, success, info — cada uno con texto, fondo y borde     |
| otros      | selección, velo (scrim), sombra de flotante, sombra de arrastre       |

- Nombres de propósito, no de apariencia (`text-secondary`, no `gray-11`). La expresión vive en
  los valores, no en los nombres.

## Escalas

Toda magnitud visible es un escalón con nombre:

| Escala     | Escalones                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| alturas    | control mínimo, control, campo, fila, sección, cabecera, título                                                                       |
| espacio    | 2, 4, 6, 8, 12, 16, 24, 32 — con alias de propósito (icono-texto, controles, grupos, secciones, relleno de panel, relleno de control) |
| radio      | 0, 2, 3, 4, 6, redondo                                                                                                                |
| tipografía | tamaño, interlínea y tracking juntos por paso                                                                                         |
| iconos     | 12, 16, 24                                                                                                                            |
| tiempo     | rápido 100–150, base 150–200, lento 200–250                                                                                           |
| curvas     | salida (ease-out), movimiento en pantalla (ease-in-out)                                                                               |
| capas (z)  | base, pegajoso, desplegable, popover, toast, diálogo                                                                                  |
| sombras    | flotante, arrastre                                                                                                                    |

- Un escalón nuevo entra en la escala, con su alias de utilidad, y se regenera; nunca un valor
  suelto en el componente.
- Huecos con alias de propósito: el componente pide «hueco entre controles», no «8».

## Temas

- Claro y oscuro desde las mismas rampas; el oscuro se rederiva (visual.md §Color).
- El tema se genera de pocas entradas (base, acento, contraste) en un espacio de color
  perceptual (OKLCH): misma luminosidad = mismo brillo percibido en todos los tonos.
- Respetar `prefers-color-scheme`, `prefers-reduced-motion` y `prefers-contrast`.
- El acento de cada aplicación es una entrada del tema, no una rama en el código.
