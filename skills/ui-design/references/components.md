# Components

Capas, variantes, estados, foco, marcado, roles, teclado, pestañas y tablas. Cómo se escribe el
archivo → skill de componentes React.

## Capas

| Capa      | Es                                                 | Sabe de dominio | Ejemplos                                 |
| --------- | -------------------------------------------------- | --------------- | ---------------------------------------- |
| Primitiva | un control o una forma, tematizado, con su teclado | no              | botón, campo, desplegable, menú, tarjeta |
| Cromo     | el marco de la ventana                             | no              | rejilla, pestañas, lateral, paleta       |
| Compuesto | primitivas montadas para una tarea                 | sí              | barra de destino, tabla de pares, visor  |
| Pantalla  | compuestos en tarjetas                             | sí              | la pestaña de una petición               |

- Una capa importa solo de las de arriba en la tabla. Una primitiva nunca conoce un compuesto.
- **Antes de dibujar, buscar la primitiva**; casi siempre existe. Orden: primitiva propia →
  primitiva sin estilo de una librería accesible (con su teclado) → a mano solo con el contrato
  completo (flechas, Enter, Escape, foco atrapado y devuelto, ARIA, clic fuera).
- Extraer en el segundo uso real. La misma lista larga de clases en varios sitios es un
  componente o un token que falta.
- **Composición en árbol**: contenedor + partes hijas, como HTML. Regla dura con sus antipatrones
  en la skill de componentes React.
- Ningún control nativo de formulario fuera de las primitivas: lo pinta el sistema y escapa del
  tema, del radio y de la tipografía.

## Variantes

Ejes pocos y ortogonales:

| Eje     | Valores                                                      |
| ------- | ------------------------------------------------------------ |
| Énfasis | sólido (primaria), relleno (secundaria), fantasma (resto)    |
| Tamaño  | 2–3 escalones de la escalera de alturas                      |
| Tono    | neutro, acento; peligro solo en el verbo de una confirmación |

- **Fantasma por defecto.** En una herramienta densa casi todo es fantasma: sin fondo en reposo,
  velo al apuntar, velo más fuerte pulsado o abierto.
- **Una sola acción sólida por vista** (enviar, conectar, guardar), en el acento. La secundaria
  es relleno gris de control, sin borde.
- **Acciones de una barra = botón de icono** con tooltip. Nunca un texto con aspecto de enlace.
- **Campo de texto = control relleno**, sin borde en reposo, gris de control; al apuntar, un paso
  más; con el foco, su línea interior en color de foco. Dentro de una tabla o una banda no lleva
  caja propia: la celda es la caja.
- **Desplegable = control relleno** con el valor elegido y un chevrón pegado al texto; abre una
  lista con aspecto de menú y marca la opción elegida con un check. Toma la altura de los
  controles vecinos.
- **Ajustes = filas de ajuste**: etiqueta y ayuda a la izquierda, control alineado a la derecha.
  Encender o apagar es un interruptor, nunca una casilla. Las filas van en grupos blancos con
  divisores tenues.

## Estados

Todo control interactivo los trae todos, distinguibles en claro, oscuro y contraste alto. Todos
en gris salvo lo que la tabla dice:

| Estado        | Señal                                                          |
| ------------- | -------------------------------------------------------------- |
| reposo        | lo mínimo: texto e icono; sin relleno salvo controles          |
| hover         | velo neutro tenue sobre lo que haya                            |
| pulsado       | velo un paso más fuerte                                        |
| abierto       | el velo de pulsado mientras su capa está abierta               |
| foco visible  | la línea propia, o una interior de 1 px, en color de foco      |
| seleccionado  | gris de selección; seleccionado + hover = selección + velo     |
| encendido     | acento: casilla marcada, interruptor encendido                 |
| deshabilitado | texto apagado ≥ 3:1, sin puntero; explica por qué              |
| cargando      | conserva su etiqueta; el indicador sustituye a su icono        |
| error         | color de error en texto o icono de lo que falló; nunca bloquea |

- Precedencia: deshabilitado > cargando > pulsado > foco > hover > reposo.
- Seleccionado, foco y hover son tres señales distintas y se suman sin taparse.
- Vistas de datos traen también: cargando (esqueleto), vacío (dice el siguiente paso), error
  (nombra el problema y la salida), escaso, denso y contenido muy largo.

## Foco

- **El foco vive dentro de la caja.** Recolorea la línea que el control ya tiene: mismo sitio,
  mismo grosor, otro color. Un control sin línea propia (campo relleno, fila, pestaña, botón)
  recibe una línea interior de 1 px en el color de foco. Solo con `:focus-visible`.
- La regla se escribe una vez, en la hoja base del tema; ningún componente dibuja su foco.
- Una celda editable sin caja propia **tiene línea igualmente**: su borde interior se recolorea
  con `:focus-within`. Navegar con flechas sin ver dónde se está no es navegar.
- El color de foco es un token del tema con 3:1 contra la superficie que lo rodea.
- Un control con borde no suma línea interior: serían dos líneas. Nada por fuera de la caja: ni
  `outline`, ni anillo con separación, ni sombra exterior, ni borde que cambia de grosor.

## Marcado

Antes de abrir una etiqueta: **¿qué trabajo hace esta caja?**

| Trabajo    | Hace                          | Elemento                                                 |
| ---------- | ----------------------------- | -------------------------------------------------------- |
| Zona       | ocupa un sitio fijo del marco | `header` `nav` `aside` `main` `footer`, solo en el cromo |
| Superficie | es una tarjeta o un grupo     | `div` con token de superficie                            |
| Sección    | agrupa contenido con nombre   | `section` + `aria-labelledby` a su encabezado visible    |
| Ritmo      | reparte espacio               | `div` con clases de maquetación                          |
| Control    | responde a la entrada         | una primitiva                                            |

- La caja sin trabajo se borra. Ningún `div` sin atributos. **Tres niveles de caja como
  máximo** dentro de un componente; el cuarto es un componente sin extraer.
- Costuras para extraer: se repite · cambia por su cuenta · tiene su propio estado · tiene su
  propio nombre.
- Cada raíz lleva un nombre estable de parte (`data-part`) que nombra el sitio, nunca la caja
  (`wrapper`, `container`). Leídos en orden, son el índice del componente.
- Landmarks una vez, en el cromo. Dentro de una tarjeta: sección con encabezado o `div`. Sin
  encabezado visible no hay sección.
- Niveles de encabezado sin saltos: uno principal por pestaña (cada pestaña es un documento), el
  siguiente en sus tarjetas.

Antipatrones de marcado:

| Antipatrón                     | En su lugar                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| Caja para separar o alinear    | el padre reparte con `gap` o rejilla                              |
| `div` solo porque JSX pide uno | fragmento: sin trabajo no hay caja                                |
| Interactivo dentro de otro     | acciones como hermanas de la zona activable, nunca botón en botón |
| Lista o tabla de `div`         | `ul`/`ol` + `li`; tabla de datos con `table` o el rol de rejilla  |
| Texto como imagen o icono solo | texto real; el icono acompaña y queda oculto al lector            |
| Orden visual ≠ orden del DOM   | el DOM en orden de lectura; el CSS no reordena lo que se recorre  |

## Roles y teclado

Un rol es una **promesa de teclado**: se escribe con su teclado o no se escribe.

| Patrón          | Obliga a                                                        |
| --------------- | --------------------------------------------------------------- |
| `tablist`/`tab` | `aria-selected`, ← →, Inicio/Fin, foco itinerante               |
| `tree`          | `treeitem`, `aria-level`, `aria-expanded`, flechas, Inicio/Fin  |
| `listbox`       | `option`, `aria-selected`, ↑ ↓, Enter                           |
| `combobox`      | `aria-expanded`, ↑ ↓ abre y recorre, Enter elige, Escape cierra |
| `menu`          | ↑ ↓, Escape cierra, el foco vuelve a quien abrió                |
| `separator`     | `aria-orientation`, valor actual y límites, flechas, enfocable  |
| `dialog`        | foco atrapado, Escape, foco de vuelta, nombre por su título     |
| `status`/`log`  | se anuncia solo y no roba el foco                               |

- **Foco itinerante** dentro de un conjunto: un elemento con `tabindex="0"`, el resto `-1`;
  flechas dentro, Tab entre conjuntos.
- Todo lo que abre una capa devuelve el foco al cerrarla.
- Nombre accesible desde los textos traducidos; si hay encabezado visible, se enlaza en vez de
  repetirlo. El nombre no repite el rol («Conexiones», no «Lista de conexiones»).
- Un solo globo por control: el tooltip de la primitiva, nunca el `title` nativo.
- `onClick` en algo que no es un control es un control sin teclado: se usa la primitiva.

## Pestañas

- Viven en la tira del marco, en una sola línea. Radio de pestaña; ni píldora ni recta; sin
  subrayado ni barra de acento.
- **Inactiva**: sin relleno. **Inactiva al apuntar**: el gris de selección. **Activa**: un paso
  más de gris, y no cambia al apuntar.
- Ancho = contenido: icono, título y **una ranura final** del ancho de un icono, reservada
  siempre. En reposo muestra el estado de lo abierto (sin guardar, conectado); al apuntar o
  enfocar, el cierre.
- Pestaña de vista previa (la reemplaza el siguiente clic simple): título en cursiva, nada más.
- Lo que no cabe se desplaza en la tira; nunca abre una segunda fila.

## Tablas

**Una sola tabla** para todo dato en filas y columnas. Su forma (borde, línea bajo cada fila,
línea entre celdas, cabecera, radio) es una, y una pantalla no la rediseña: elige entre las dos
variantes de abajo.

| Variante | Filas son                         | Acciones de fila                | Hover de fila |
| -------- | --------------------------------- | ------------------------------- | ------------- |
| Listado  | cosas (orígenes, espacios, items) | siempre visibles                | sí            |
| Campos   | pares que se editan               | al apuntar o con el foco dentro | no            |

Listas de pares (parámetros, cabeceras, campos, variables) son la variante de campos:

- Clave, valor e interruptor: el interruptor apaga sin borrar; la clave nunca se apaga.
- Termina en una fila vacía permanente: escribir en ella crea la línea y otra vacía ocupa su
  lugar. Sin botón «añadir».
- Acciones de la fila (tirador, tipo, quitar) en un sitio reservado: aparecer no mueve nada.
- Metadatos que no se envían (tipo, descripción): junto a lo que describen, nunca en otra fila
  ni en un diálogo. Si la lista no lleva tipos, no hay botón de tipo.
- Edición masiva como texto: un par por línea, `clave:valor`, los apagados comentados.
