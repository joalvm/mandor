# Visual

Color, contraste, superficies, bordes, sombras, radio, tipografía, iconos y movimiento.

## Color

- **Rampas de 12 pasos por tono**, definidas de antemano; nunca aclarar u oscurecer al vuelo.
  Uso de cada paso:

    | Paso | Uso                                         | Paso | Uso                       |
    | ---- | ------------------------------------------- | ---- | ------------------------- |
    | 1    | fondo de la app                             | 7    | borde de lo interactivo   |
    | 2    | fondo sutil: lateral, bloque de código      | 8    | borde fuerte, foco        |
    | 3    | control en reposo; hover de lo transparente | 9    | relleno sólido del acento |
    | 4    | control en hover; seleccionado suave        | 10   | hover del sólido          |
    | 5    | control pulsado o seleccionado              | 11   | texto secundario          |
    | 6    | borde de lo no interactivo                  | 12   | texto principal           |

- **Neutros con un matiz.** Un solo tono para todas las superficies, apenas teñido hacia la
  marca; cambia solo la luminosidad. Ni negro puro ni blanco puro.
- **Acento escaso**: foco, selección, elemento activo y una acción primaria por vista. Menos del
  5 % de los píxeles. Nunca en reposo, nunca decorativo, nunca en contenido.
- **Semánticos** (peligro, aviso, éxito, info) significan estado y nada más. Nunca solo color:
  icono o texto acompañan.
- Los tonos categóricos (métodos, tipos, gráficos) son una familia aparte de los semánticos, de
  croma bajo, y no se reutilizan como estado.
- Sobre un fondo de color, texto, borde y sombra se tiñen de ese tono; nunca gris encima.
- **Oscuro se rederiva, no se invierte.** La luz separa capas: cada nivel (ventana, panel,
  flotante, diálogo) un escalón más claro que el de debajo, y dos capas contiguas nunca comparten
  valor. Acentos y semánticos un 10–20 % menos saturados. En claro separa la sombra.

## Contraste

| Qué                                       | Mínimo                       |
| ----------------------------------------- | ---------------------------- |
| Texto normal y marcador de posición       | 4.5:1                        |
| Texto ≥ 18 px o ≥ 14 px seminegrita       | 3:1                          |
| Borde de control, icono con significado   | 3:1                          |
| Diferencia entre estados (reposo, hover…) | visible en claro y en oscuro |

- Hover, activo y foco llevan **más** contraste que el reposo, nunca menos.
- Se miden los dos temas por separado. APCA sirve para afinar texto apagado; el umbral que manda
  es el de la tabla.

## Superficies, bordes y sombras

- **Una estrategia de profundidad por capa.** Lo fijo (paneles, laterales, barras) se separa por
  tono y una costura de 1 px. Solo lo que flota lleva sombra.
- **Borde = costura entre zonas.** Prueba: si al quitarlo no se pierde ninguna frontera entre
  zonas, sobraba. Sin contorno de lista, línea bajo cada fila, marco de grupo ni borde de color
  para un estado: el estado es relleno.
- Bordes de 1 px, de paso 6 (no interactivo) o 7 (interactivo). Nunca 2 px ni cambio de grosor
  al enfocar.
- Un campo que recibe texto puede bajar un escalón (hundido) respecto a su entorno; un menú o
  popover sube uno.
- **Sombra de lo flotante**: anillo de 1 px semitransparente + dos capas suaves (ambiente y
  directa), con un solo foco de luz. En oscuro basta el anillo claro. Nunca sombra dura
  desplazada, brillo, ni sombra en un panel fijo. Las sombras no se animan.
- Desenfoque y transparencia solo en capas flotantes, con alternativa sólida.

## Radio

Escalera corta, por tamaño de superficie:

| Superficie                                      | Radio   |
| ----------------------------------------------- | ------- |
| Barras y paneles pegados al borde de la ventana | 0       |
| Elementos < 20 px: insignia, chip, casilla      | 2       |
| Controles, filas, pestañas, campos              | 3       |
| Menú, popover, tarjeta flotante, toast          | 4       |
| Diálogo, paleta de órdenes                      | 6       |
| Punto de estado, interruptor, avatar            | redondo |

- **Concéntrico**: radio interior = radio exterior − (relleno + borde), nunca negativo. Mismo
  radio en padre e hijo es el error más visible.
- Sin radio en las uniones: mitades de un botón partido, grupos pegados, lo que toca otra
  superficie.
- Píldora solo en lo diminuto (interruptor, punto). Nunca en botones ni pestañas.

## Tipografía

- **Una familia** para toda la interfaz (la del sistema o una neo-grotesca empaquetada) y una
  monoespaciada solo para código, datos y medidas. Nunca fuentes de display en etiquetas.
- Escala fija, sin tamaños fluidos dentro de paneles:

    | Paso   | Tamaño / interlínea  | Uso                             |
    | ------ | -------------------- | ------------------------------- |
    | suelo  | 10–11 / 12–16        | atajos, contadores, pies        |
    | meta   | 12 / 16              | filas densas, insignias, ayudas |
    | base   | 13 / 16, 20 en prosa | cuerpo de la interfaz           |
    | código | 13 / 20              | editor y valores                |
    | título | 14 / 20 seminegrita  | cabecera de sección o de panel  |
    | grande | 16–20                | solo vacíos y bienvenidas       |

- **Jerarquía = tamaño + peso + color**, juntos. Cuatro tonos de texto: principal, secundario,
  terciario (meta) y apagado (deshabilitado). Dos pesos bastan: 400 y 600.
- Cifras tabulares en todo número que cambia: códigos de estado, tiempos, tamaños, columnas.
- Una línea por etiqueta: se recorta con `…`, nunca envuelve un control. `…` es un carácter, no
  tres puntos. Espacio indivisible entre número y unidad.

## Iconos

- Un solo juego, un solo grosor de trazo. 16 px por defecto; 12 en filas densas e insignias.
  Tamaño del glifo y área del control son decisiones distintas.
- Color desde tokens semánticos: secundario en reposo, principal al apuntar. Un color de
  estado solo cuando el icono **es** el estado (éxito, error, dirección de un flujo).
- Menos iconos: solo donde ayudan a reconocer (tipos, estados, órdenes universales). Un verbo
  sin metáfora clara lleva texto.
- Icono dentro de un control: oculto al lector; el nombre lo lleva el control.

## Movimiento

| Frecuencia de la acción                 | Animación                                |
| --------------------------------------- | ---------------------------------------- |
| Cientos al día, o disparada por teclado | ninguna                                  |
| Decenas al día (hover, navegación)      | solo color, 100–150 ms                   |
| Ocasional (menú, popover, toast)        | opacidad + escala desde 0.96, 150–200 ms |
| Rara (diálogo)                          | 200–250 ms                               |

- Entrar con ease-out; salir más rápido que entrar. Nunca ease-in, nunca > 300 ms, nunca
  `transition: all`. Solo `transform` y `opacity`.
- Nada nace desde escala 0. Menús y popovers crecen desde su disparador.
- Interrumpible: transiciones, no animaciones encadenadas.
- Con movimiento reducido se quita el desplazamiento y queda el cambio de opacidad. Un indicador
  de trabajo en curso (spinner) sigue girando: es información, no adorno.
- Carga: indicador solo si tarda > 200 ms; una vez visible, al menos 300 ms. Un esqueleto copia
  la forma final exacta.
