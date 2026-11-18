# Layout

Ventana, zonas, bandas, densidad, ritmo, encoger y desplazar.

## Ventana

```
barra de título
┌ actividad ┬ lateral ┬─────────── área de trabajo ───────────┐
│           │ árbol   │ pestañas                               │
│           │         │ ┌ compone ────────┬ recibe ───────────┐ │
│           │         │ │ lo que se envía │ lo que vuelve     │ │
│           │         │ └─────────────────┴───────────────────┘ │
└───────────┴─────────┴────────────────────────────────────────┘
barra de estado
```

- **Zonas fijas, acopladas y redimensionables.** Nada flota sobre el área de trabajo salvo las
  capas pasajeras (menú, popover, toast, diálogo, paleta).
- **La izquierda compone, la derecha recibe**: lo que el usuario escribe y envía a la izquierda
  (o arriba); lo que vuelve (respuesta, mensajes, actividad) a la derecha (o abajo).
- La navegación (árbol de recursos) vive en el lateral, fuera de las divisiones del trabajo. Un
  solo lateral. Ancho por defecto 240–280 px.
- Barra de estado: izquierda = lo del espacio de trabajo; derecha = lo del documento activo.
  Etiquetas breves, sin color propio.
- Divisor: línea visible de 1 px, zona de agarre ≥ 4 px, doble clic restaura. La proporción de
  una división es estado de vista.
- Un foco visual por vista; todo lo demás, a propósito, un escalón por debajo.

## Bandas

Una **banda** es una fila que sostiene controles: barra de título, tira de pestañas, barra de
herramientas, cabecera de sección, pie. Declara tres cosas, ninguna deducida de otra:

| Declara             | Con                                   | Si falta                                 |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| Altura              | token de la escala de alturas         | mide lo que midan sus hijos, y varía     |
| Alineación vertical | contenido centrado en vertical        | el hijo de alto fijo se estira o se pega |
| Relleno lateral     | token de relleno (de panel o control) | el contenido toca el borde               |

- **Banda = control más alto que sostiene + un paso de aire** (4 px por lado). Crece el
  control, crece la banda; nunca se encoge un control para que quepa.
- Todos los controles de una banda comparten altura: botón, desplegable y campo, el mismo token.
- Una banda es una tira con costura, no una tarjeta: sin fondo propio, sin radio, sin sombra.
- Una librería ajena no trae permiso de geometría: sus alturas y rellenos se retematizan hasta
  la escala.

## Densidad

Escalera de alturas, cada escalón un token:

| Pieza                              | Altura |
| ---------------------------------- | ------ |
| Control mínimo (icono en fila)     | 22     |
| Control de banda, fila de lista    | 24     |
| Campo de formulario                | 26–28  |
| Control destacado (enviar)         | 28     |
| Cabecera de sección                | 32     |
| Cabecera de panel, barra de título | 40     |
| Barra de estado                    | 22–24  |

- Objetivo de puntero mínimo 24 × 24; si el glifo es menor, el área de clic se amplía, no el
  dibujo. La fila entera es el objetivo.
- ≥ 4 px entre botones de icono vecinos; ningún área de clic se solapa con otra.
- La densidad es una decisión global: un valor repetido en todo el conjunto, no un ajuste por
  componente.

## Ritmo

El hueco lo pone el padre con `gap` y un **token con significado** (qué separa: icono-texto,
controles, grupos, secciones), nunca un número. Los hijos no llevan márgenes; un margen `auto`
en un eje es la única excepción.

- Escala base de 4 px: 2, 4, 6, 8, 12, 16, 24, 32. Dentro de un grupo, escalones pequeños; entre
  grupos, un salto claro. Huecos iguales en todo aplanan la jerarquía.
- Relleno de panel 8–12 px; de control 6–8 px en horizontal. Más aire encima de un título que
  debajo.
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

- Maquetación intrínseca: envoltura, `minmax(0, 1fr)`, `clamp()`. Ningún `@media` dentro de un
  panel: su ancho lo decide el usuario, no la pantalla. Nada de medir con JavaScript para
  decidir qué pintar; si el CSS necesita un dato del runtime, llega por un atributo `data-*`.
- Alinear a una rejilla, una línea base o un borde. Iconos, etiquetas y botones del lateral y de
  las pestañas, alineados en los dos ejes.

## Encoger y desplazar

- Todo hijo de flex o grid tiene `min-width: auto` y no baja de su contenido. **Cada caja** de la
  cadena, desde la raíz hasta el texto que se recorta, lleva `min-w-0`; en vertical, `min-h-0`.
- Alto o ancho fijo → `shrink-0`.
- Recortar y desplazar, en cajas distintas. Un solo desplazamiento por eje en cada anidación.
- Panel que crece y desplaza: `flex-1 min-h-0` con desborde automático.
- Barras de desplazamiento finas, declaradas una vez en la base del tema, y solo donde hay algo
  que desplazar.
- Las capas flotantes salen por portal: nunca posicionadas dentro de un ancestro que recorta.
