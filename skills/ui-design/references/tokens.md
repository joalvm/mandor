# Tokens

Capas, nombres, escalas, densidad y temas.

## Capas

| Capa       | Contiene                                  | Ejemplo                                           | La usa                 |
| ---------- | ----------------------------------------- | ------------------------------------------------- | ---------------------- |
| Primitiva  | valores crudos: rampas, escalas           | `gray-3`, `space-4`, `radius-panel`               | solo la capa semántica |
| Semántica  | significado                               | `surface-card`, `text-secondary`, `border-subtle` | los componentes        |
| Componente | ajuste propio de una pieza, si hace falta | `toast-width`                                     | esa pieza              |

- Los componentes usan **solo semánticos**. Ningún hex, ningún píxel, ningún valor arbitrario
  fuera de las hojas de tokens.
- El tema cambia en la capa semántica; la densidad, en la escala. Las primitivas no saben de
  temas ni de densidad.
- Un token de componente existe solo cuando la pieza necesita afinarse aparte; si no, sobra.
- **Se elige por significado, nunca porque «se ve igual»**: en otro tema dejará de verse igual.
- Una sola fuente genera las hojas; lo generado se comprueba contra la fuente en cada
  verificación.
- Cada token documenta su propósito. Uno que ya no se usa se retira.

## Nombres

`propiedad-rol-variante-estado`, de lo general a lo particular; el rol por defecto no lleva
modificador.

| Familia    | Roles                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| superficie | frame, card, raised, sunken, overlay, control, selected; hover, active |
| texto      | primary, secondary, tertiary, disabled, on-accent, accent              |
| borde      | subtle, strong, focus                                                  |
| acento     | solid, solid-hover, soft                                               |
| estado     | error, warning, success, info — cada uno con texto, fondo y borde      |
| otros      | velo de fondo (scrim), sombra de flotante, de diálogo y de arrastre    |

- Nombres de propósito, no de apariencia (`text-secondary`, no `gray-11`). La expresión vive en
  los valores, no en los nombres.
- `hover` y `active` son **velos** semitransparentes que se ponen sobre cualquier superficie;
  `selected` es un gris opaco. Ninguno lleva acento.

## Escalas

Toda magnitud visible es un escalón con nombre:

| Escala     | Escalones                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| alturas    | control mínimo, control, campo de destino, fila, pestaña, tira, sección, título, estado, control de diálogo      |
| espacio    | 2, 4, 6, 8, 12, 16, 24, 32 — con alias de propósito (icono-texto, controles, grupos, secciones, hueco del marco) |
| relleno    | de control, de tarjeta, de diálogo                                                                               |
| radio      | 0, 2, 3, pestaña 6, tarjeta 10, superposición 12, redondo                                                        |
| anchos     | lateral, aviso, diálogo estrecho y ancho                                                                         |
| tipografía | tamaño, interlínea y peso juntos por paso                                                                        |
| iconos     | 12, 14, 16                                                                                                       |
| tiempo     | rápido 100–150, base 150–200; diálogo 200 al entrar y 150 al salir                                               |
| curvas     | salida (ease-out), movimiento en pantalla (ease-in-out)                                                          |
| capas (z)  | base, pegajoso, desplegable, popover, aviso, diálogo                                                             |
| sombras    | flotante, diálogo, arrastre                                                                                      |

- Un escalón nuevo entra en la escala, con su alias de utilidad, y se regenera; nunca un valor
  suelto en el componente.
- Huecos con alias de propósito: el componente pide «hueco entre controles», no «8».

## Densidad

- La densidad es un atributo en la raíz del documento que reescribe **solo** tokens de escala:
  hueco del marco, radio de tarjeta, alto de tira y de pestaña, alto de fila (layout.md
  §Densidad).
- En compacta, donde el hueco desaparece entra la línea: el mismo token que da el hueco decide si
  se pinta un separador.
- Ningún componente lee la densidad ni ramifica por ella.

## Temas

- Claro, oscuro y contraste alto desde las mismas rampas; el oscuro se rederiva (visual.md
  §Color).
- El tema se genera de pocas entradas (base, acento, contraste) en un espacio de color
  perceptual (OKLCH): misma luminosidad = mismo brillo percibido en todos los tonos.
- Respetar `prefers-color-scheme`, `prefers-reduced-motion` y `prefers-contrast`.
- El acento de cada aplicación es una entrada del tema, no una rama en el código.
