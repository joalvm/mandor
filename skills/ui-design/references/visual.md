# Visual

Color, contraste, superficies, bordes, sombras, radio, tipografía, iconos y movimiento.

## Color

- **Rampas de 12 pasos por tono**, definidas de antemano; nunca aclarar u oscurecer al vuelo.
  Uso de cada paso:

    | Paso | Uso                               | Paso | Uso                       |
    | ---- | --------------------------------- | ---- | ------------------------- |
    | 1    | tarjeta en claro; marco en oscuro | 7    | borde de lo interactivo   |
    | 2    | marco en claro; tarjeta en oscuro | 8    | borde fuerte, foco        |
    | 3    | relleno de control en reposo      | 9    | relleno sólido del acento |
    | 4    | control al apuntar                | 10   | hover del sólido          |
    | 5    | control pulsado o abierto         | 11   | texto secundario          |
    | 6    | borde de lo no interactivo        | 12   | texto principal           |

- **Neutros sin color.** Un gris para todas las superficies; cambia solo la luminosidad. Los
  estados son velos neutros semitransparentes sobre la superficie que haya.
- **Acento escaso**: la acción primaria de la vista, lo encendido (casilla, interruptor), la
  marca de la app y el foco. Menos del 5 % de los píxeles. Nunca en un estado de selección,
  nunca decorativo, nunca en contenido. Cada app tiene el suyo; es una entrada del tema.
- **Semánticos** (peligro, aviso, éxito, info) significan estado de un resultado y nada más.
  Nunca solo color: icono o texto acompañan.
- Los tonos categóricos (métodos, tipos, gráficos) son una familia aparte de los semánticos, de
  croma bajo, y no se reutilizan como estado.
- **Oscuro se rederiva, no se invierte.** En claro, el marco es un gris muy claro y la tarjeta
  blanca; en oscuro, el marco es el más hondo y la tarjeta sube un escalón. Lo que flota sube
  otro. Dos capas contiguas nunca comparten valor.

## Contraste

| Qué                                       | Mínimo                       |
| ----------------------------------------- | ---------------------------- |
| Texto normal y marcador de posición       | 4.5:1                        |
| Texto ≥ 18 px o ≥ 14 px seminegrita       | 3:1                          |
| Línea de foco, icono con sentido          | 3:1                          |
| Borde que identifica un control           | 3:1                          |
| Tarjeta sobre marco                       | visible en claro y en oscuro |
| Diferencia entre estados (reposo, hover…) | visible en claro y en oscuro |

- Hover, seleccionado, activo y foco llevan **más** contraste que el reposo, nunca menos.
- Se miden los temas por separado, incluido el de contraste alto. APCA sirve para afinar texto
  apagado; el umbral que manda es el de la tabla.

## Superficies

| Capa     | Es                                                | Separa por            |
| -------- | ------------------------------------------------- | --------------------- |
| Marco    | la ventana: título, lateral, pestañas, estado     | —                     |
| Tarjeta  | un contenido: request, respuesta, consola, página | tono + hueco          |
| Control  | campo, desplegable, segmento, botón secundario    | relleno gris          |
| Flotante | menú, popover, tooltip, aviso, diálogo, paleta    | tono + borde + sombra |

- **Sólidas.** Ninguna superficie usa transparencia ni desenfoque. Tablas, grupos, árboles,
  menús y popovers son tan blancos como su tarjeta.
- Un control no dibuja caja propia dentro de una tabla o una banda cuando la celda ya es su caja.

## Bordes

Un borde solo cuando separa algo de verdad. El resto lo hacen el tono y el espacio.

| Sí                                                  | No                                           |
| --------------------------------------------------- | -------------------------------------------- |
| Método \| URL dentro de su campo                    | Alrededor de una tarjeta o entre tarjetas    |
| La tabla: borde, línea bajo cada fila, entre celdas | Campos, desplegables, segmentos, secundarios |
| Divisor arrastrable dentro de una tarjeta           | Cabeceras de tarjeta y migas                 |
| Zona fija del lateral                               | Bajo la tira de pestañas                     |
| Borde fino de lo flotante                           | Pie de un editor; teclas de atajo            |
| Caja de alto fijo (árbol de elegir) y grupos        | Entre las partes de un diálogo               |
| Separadores en densidad compacta                    | Para marcar un estado: el estado es relleno  |

- Bordes de 1 px. Nunca 2 px ni cambio de grosor al enfocar. Lo flotante, con el borde sutil,
  nunca el fuerte: un contorno duro hace gris lo blanco.

## Sombras

- **Solo lo que flota.** Anillo de 1 px semitransparente + dos capas suaves (ambiente y
  directa), con un solo foco de luz; el diálogo, con más distancia. En oscuro basta el anillo
  claro. Una tarjeta o una barra fija nunca. Las sombras no se animan.

## Radio

Escalera corta, por tamaño de superficie:

| Superficie                                              | Radio   |
| ------------------------------------------------------- | ------- |
| Barras pegadas al borde de la ventana; todo en compacta | 0       |
| Elementos < 20 px: insignia, chip, casilla              | 2       |
| Controles, filas, tooltip, teclas                       | 3       |
| Pestaña                                                 | 6       |
| Tarjeta, grupo, menú, popover, sugerencias, paleta      | 10      |
| Diálogo, aviso flotante                                 | 12      |
| Punto de estado, interruptor, avatar, contador          | redondo |

- **Concéntrico**: radio interior = radio exterior − (relleno + borde), nunca negativo. Mismo
  radio en padre e hijo es el error más visible.
- Sin radio en las uniones: mitades de un botón partido, grupos pegados, lo que toca otra
  superficie.
- Píldora solo en lo diminuto (interruptor, punto, contador `×N`). Nunca en botones ni pestañas.

## Tipografía

- **Una familia** para toda la interfaz, URL, tablas y valores incluidos. La monoespaciada solo
  donde hay código: editores, payload de la actividad y consola.
- Escala fija, sin tamaños fluidos dentro de paneles:

    | Paso    | Tamaño / interlínea  | Uso                                     |
    | ------- | -------------------- | --------------------------------------- |
    | suelo   | 11 / 16              | atajos, contadores, etiqueta de grupo   |
    | meta    | 12 / 16              | ayudas, metadatos, filas densas         |
    | base    | 13 / 18, 20 en prosa | cuerpo de la interfaz, URL, tablas      |
    | código  | 12–13 / 20           | editor, payload, consola                |
    | título  | 14 / 20 seminegrita  | cabecera de sección o de tarjeta        |
    | diálogo | 16 / 24 seminegrita  | título de diálogo                       |
    | página  | 18 / 24 seminegrita  | título de una pestaña de página, vacíos |

- **Jerarquía = tamaño + peso + color**, juntos. Cuatro tonos de texto: principal, secundario,
  terciario (meta) y apagado (deshabilitado). Dos pesos bastan: 400 y 600.
- Cifras tabulares en todo número que cambia: códigos de estado, tiempos, tamaños, columnas.
- Una línea por etiqueta: se recorta con `…`, nunca envuelve un control. `…` es un carácter, no
  tres puntos. Espacio indivisible entre número y unidad.

## Iconos

- Un solo juego de iconos de editor, con su trazo. Primero el juego establecido; un glifo propio
  solo cuando ninguno sirve (skill de iconografía). 16 px por defecto; 14 en filas y bandas
  densas; 12 en chevrones e insignias.
- Color desde tokens: secundario en reposo, principal al apuntar. Un color de estado solo cuando
  el icono **es** el estado (éxito, error, dirección de un flujo).
- Menos iconos: solo donde ayudan a reconocer (tipos, estados, órdenes universales). Un verbo
  sin metáfora clara lleva texto. Un diálogo de alerta no lleva icono.
- Icono dentro de un control: oculto al lector; el nombre lo lleva el control.

## Movimiento

| Frecuencia de la acción                 | Animación                                         |
| --------------------------------------- | ------------------------------------------------- |
| Cientos al día, o disparada por teclado | ninguna: paleta, pestañas, foco, atajos           |
| Decenas al día (hover, navegación)      | solo color, 100–150 ms                            |
| Ocasional (menú, popover, aviso)        | opacidad + escala desde 0.96, 150–200 ms          |
| Rara (diálogo)                          | entra 200 ms desde 0.96 al centro; sale en 150 ms |

- Entrar con ease-out; salir más rápido que entrar. Nunca ease-in, nunca > 300 ms, nunca
  `transition: all`. Solo `transform` y `opacity`.
- Nada nace desde escala 0. Menús y popovers crecen desde su disparador; el diálogo, desde el
  centro, sin deslizar.
- Interrumpible: transiciones, no animaciones encadenadas. La pila de avisos se reordena con
  transiciones.
- Con movimiento reducido se quita el desplazamiento y la escala; queda la opacidad. Un indicador
  de trabajo en curso sigue girando: es información, no adorno.
- Carga: indicador solo si tarda > 200 ms; una vez visible, al menos 300 ms. Un esqueleto copia
  la forma final exacta.
