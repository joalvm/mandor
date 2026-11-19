# Layout

Marco, tarjetas, pestaña de trabajo, bandas, densidad, ritmo, encoger y desplazar.

## Marco y tarjetas

```
barra de título    marca · centro de comandos (centrado) · controles de ventana
┌ lateral ────┬ tira de pestañas ─────────────────────────────────┐
│ árbol       │ ┌ destino ──────────────────────────────────────┐ │
│             │ └───────────────────────────────────────────────┘ │
│             │ ┌ compone ──────────────┐ ┌ recibe ─────────────┐ │
│             │ │ lo que se envía       │ │ lo que vuelve       │ │
│             │ └───────────────────────┘ └─────────────────────┘ │
│             │ ┌ consola (plegable) ───────────────────────────┐ │
│             │ └───────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────────┘
barra de estado
```

- **El marco es la ventana y no se mueve.** Barra de título, lateral, tira de pestañas y barra
  de estado se pintan sobre él, sin caja propia. Es el tono más bajo de la ventana.
- **Cada contenido es una tarjeta**: superficie sólida, radio de tarjeta, sin borde ni sombra.
  Entre tarjetas, el hueco del marco; entre una tarjeta y el borde de la ventana, el mismo hueco.
- **Una tarjeta no contiene tarjetas.** Dentro, las zonas se separan con espacio, tono o un
  divisor arrastrable. Lo que parece pedir otra tarjeta es una sección con encabezado.
- **Arriba el destino, abajo el trabajo.** Una pestaña de trabajo apila una tarjeta de destino
  (adónde va: método, dirección, enviar o conectar) sobre dos tarjetas lado a lado: a la
  izquierda la que **compone** lo que sale, a la derecha la que **recibe** lo que vuelve.
- Una pestaña de página (ajustes, gestión, documentación) es **una** tarjeta con su título.
- **La consola es una tarjeta al pie**, a lo ancho del área de trabajo; se pliega y se despliega
  desde la barra de estado y conserva su alto.
- **El centro de comandos** vive centrado en la barra de título: un campo de búsqueda que abre la
  paleta. Es la entrada a toda orden.
- Barra de estado: izquierda = lo del espacio de trabajo; derecha = lo del documento activo.
  Etiquetas breves, sin color propio.
- El lateral es uno, con ancho por defecto de 240–280 px; su zona fija (selector, pie) se
  separa del árbol con una línea.
- Divisores entre tarjetas: el hueco es la zona de agarre (≥ 4 px), sin línea; doble clic
  restaura. La proporción de una división es estado de vista.
- Un foco visual por vista; todo lo demás, a propósito, un escalón por debajo.

## Bandas

Una **banda** es una fila que sostiene controles: barra de título, tira de pestañas, cabecera de
tarjeta, barra de herramientas, pie. Declara tres cosas, ninguna deducida de otra:

| Declara             | Con                                     | Si falta                                 |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| Altura              | token de la escala de alturas           | mide lo que midan sus hijos, y varía     |
| Alineación vertical | contenido centrado en vertical          | el hijo de alto fijo se estira o se pega |
| Relleno lateral     | token de relleno (de tarjeta o control) | el contenido toca el borde               |

- **Banda = control más alto que sostiene + un paso de aire** (4 px por lado). Crece el
  control, crece la banda; nunca se encoge un control para que quepa.
- Todos los controles de una banda comparten altura: botón, desplegable y campo, el mismo token.
- Una banda es una tira, no una tarjeta: sin fondo propio, sin radio, sin sombra, sin línea
  debajo. La cabecera de una tarjeta es parte de la tarjeta.
- **Una línea siempre.** Ninguna banda envuelve: el texto se recorta con `…`, los controles
  sobrantes van a un menú de desborde, los anchos se ajustan al contenido.
- Una librería ajena no trae permiso de geometría: sus alturas y rellenos se retematizan hasta la
  escala.

## Densidad

Dos densidades, una sola decisión global. **Cómoda** por defecto; **compacta** es la variante
cuadrada: sin hueco ni radio, y una línea donde antes había hueco.

| Pieza                        | Cómoda  | Compacta          |
| ---------------------------- | ------- | ----------------- |
| Barra de título              | 40      | 40                |
| Tira de pestañas · pestaña   | 38 · 28 | 32 · 30           |
| Fila de árbol o de lista     | 24      | 22                |
| Control                      | 28      | 28                |
| Campo de destino             | 30      | 30                |
| Control dentro de un diálogo | 32      | 32                |
| Cabecera de sección          | 32      | 32                |
| Barra de estado              | 26      | 26                |
| Hueco del marco              | 8       | 0 + línea de 1 px |
| Radio de tarjeta             | 10      | 0                 |

- La densidad cambia tokens de escala, nada más: ningún componente pregunta en qué densidad está.
- Objetivo de puntero mínimo 24 × 24; si el glifo es menor, se amplía el área de clic, no el
  dibujo. La fila entera es el objetivo.
- ≥ 4 px entre botones de icono vecinos; ningún área de clic se solapa con otra.

## Ritmo

El hueco lo pone el padre con `gap` y un **token con significado** (qué separa: icono-texto,
controles, grupos, secciones), nunca un número. Los hijos no llevan márgenes; un margen `auto`
en un eje es la única excepción.

- Escala base de 4 px: 2, 4, 6, 8, 12, 16, 24, 32. Dentro de un grupo, escalones pequeños; entre
  grupos, un salto claro. Huecos iguales en todo aplanan la jerarquía.
- Relleno de tarjeta 12 px; de control 8 px en horizontal; de diálogo 24 px. Más aire encima de
  un título que debajo.
- Lo relacionado, más cerca entre sí que de lo vecino. Un control dependiente, pegado a su
  principal.

Siempre las mismas ocho formas:

| Forma   | Hace                           | Base                                             |
| ------- | ------------------------------ | ------------------------------------------------ |
| pila    | uno bajo otro                  | flex en columna + gap                            |
| racimo  | en línea, envuelve             | flex con envoltura, centrado en vertical + gap   |
| fila    | en línea, sin envolver         | flex, `min-w-0`, centrado en vertical + gap      |
| partida | dos lados                      | flex + margen `auto` en el primero               |
| lateral | ancho fijo + resto             | grid con `minmax(0, 1fr)`                        |
| cuadro  | rejilla que se llena sola      | grid + `minmax()` en la plantilla                |
| centro  | ancho tope, centrado           | margen `auto` + ancho máximo + aire              |
| cinta   | scroll en un eje, sin envolver | flex con desborde en x + `shrink-0` en los hijos |

- El racimo nunca va en el cromo: el cromo es una línea.
- Maquetación intrínseca: envoltura, `minmax(0, 1fr)`, `clamp()`. Ningún `@media` dentro de una
  tarjeta: su ancho lo decide el usuario, no la pantalla. Nada de medir con JavaScript para
  decidir qué pintar; si el CSS necesita un dato del runtime, llega por un atributo `data-*`.
- Alinear a una rejilla, una línea base o un borde. Iconos, etiquetas y botones del lateral y de
  las pestañas, alineados en los dos ejes.

## Encoger y desplazar

- Todo hijo de flex o grid tiene `min-width: auto` y no baja de su contenido. **Cada caja** de la
  cadena, desde la raíz hasta el texto que se recorta, lleva `min-w-0`; en vertical, `min-h-0`.
- Alto o ancho fijo → `shrink-0`.
- Recortar y desplazar, en cajas distintas. Un solo desplazamiento por eje en cada anidación.
- Tarjeta que crece y desplaza: `flex-1 min-h-0` con desborde automático; desplaza su cuerpo, no
  su cabecera.
- Barras de desplazamiento finas, declaradas una vez en la base del tema, y solo donde hay algo
  que desplazar.
- Las capas flotantes salen por portal: nunca posicionadas dentro de un ancestro que recorta.
