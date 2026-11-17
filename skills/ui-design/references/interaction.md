# Interaction

Superposiciones y tiempos, edición en sitio, teclado, avisos, bloqueo y destrucción.

## Superposiciones

Elegir por la pregunta, en este orden; la primera que encaja gana:

| Necesidad                                     | Pieza            | Abre                                                                    | Cierra                                         |
| --------------------------------------------- | ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Nombrar un control de icono                   | tooltip          | reposo 400 ms; foco de teclado al instante; vecinos 0 ms durante 300 ms | al salir, Escape                               |
| Explicar un dato al pasar (desglose, detalle) | tarjeta flotante | reposo 400 ms; foco de teclado                                          | 150 ms tras salir de control y tarjeta; Escape |
| Elegir un valor guardado                      | desplegable      | clic, ↓, Enter                                                          | elegir, Escape, clic fuera                     |
| Ejecutar una orden                            | menú             | clic, ↓, menú contextual                                                | elegir, Escape, clic fuera                     |
| Ajustar algo anclado a un control             | popover          | clic                                                                    | Escape, clic fuera                             |
| Detener la ventana                            | diálogo          | solo con motivo (abajo)                                                 | Escape, sus botones                            |

- **Pasar no es pedir.** Una tarjeta o un tooltip no abren con un paso rápido del puntero; hace
  falta reposo. Un clic sobre el control no abre ni fija la tarjeta: el foco que deja un clic
  no cuenta como foco de teclado.
- Lo que se abre al pasar se puede recorrer: el puntero entra en la tarjeta sin que se cierre, y
  se cierra al salir de los dos. Escape siempre cierra sin mover el puntero.
- Una tarjeta flotante solo informa: nada en ella se usa. Si hay algo que pulsar, es un
  popover.
- El tooltip nombra; no documenta. Lo que hay que leer va en línea o en una tarjeta.
- Lo condicional crece donde se promete: los campos que dependen de un valor aparecen dentro del
  popover que lo ofrece, no en otro diálogo.
- Desplegable con más de 10 opciones: con búsqueda. Opciones agrupadas, con el nombre del grupo
  y una línea entre grupos.

### Diálogos

Un diálogo detiene la ventana. Entra solo por uno de cuatro motivos, escrito junto al uso:

`system-dialog` · `irreversible-confirmation` · `security-decision` · `short-config-form`. Sin
motivo → popover anclado o pestaña.

- Un solo marco (fondo, superficie, banda de título, movimiento) escrito una vez; quien lo usa
  escribe solo el contenido: navegación lateral, cuerpo que desplaza, pie con acciones a la
  derecha.
- El tamaño lo decide el contenido. Nunca un diálogo sobre otro.

## Edición en sitio

- **Acciones al apuntar, estructura en reposo.** Las acciones de una fila aparecen al apuntar y
  permanecen con el foco dentro. En reposo queda solo lo que la fila **es**. Lo que aparece no
  mueve nada: el sitio está reservado.
- **Añadir es escribir.** Una lista abierta termina en una fila vacía permanente; el foco sigue
  al texto hasta la línea nueva.
- **El foco se mueve con el dato.** Crear, reordenar o borrar deja el foco donde el usuario
  seguía: en la línea nueva, en la que ocupó el lugar. Nunca cae al documento.
- **Arrastrar tiene testigo**: tirador visible al apuntar, captura del puntero, la fila flota con
  sombra de arrastre y empieza tras 4–6 px de movimiento. Todo arrastre tiene alternativa de
  teclado.
- **La derivación es vista, nunca campo.** Lo que el sistema compone de lo escrito (una URL con
  sus parámetros) se muestra aparte, de solo lectura y vivo; nunca se escribe dentro del campo.
- Guardar es implícito o con el atajo; un cambio sin guardar se marca en la pestaña, y salir con
  cambios pregunta o conserva el borrador.

## Teclado

- Toda tabla o rejilla editable se recorre con Tab (orden de lectura) y flechas; izquierda y
  derecha cambian de celda solo desde el borde del texto. Si no se llena sin ratón, no está
  hecha.
- Enter envía en un campo de una línea; en uno de varias, Ctrl/Cmd+Enter envía y Enter salta de
  línea. El atajo de enviar funciona desde cualquier parte de su panel.
- Toda orden está en la paleta, con su atajo a la vista. La paleta abre y cierra sin animación.
- Atajos con los glifos de la plataforma; sin chocar con los del sistema.
- Respuesta al pulsar en < 100 ms; si el resultado tarda > 400 ms, se dice que está en curso.

## Avisos

Dos canales, y ninguno más:

| Canal    | Para                                                      | Forma                                                                       |
| -------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Toast    | lo efímero: guardado, copiado, fallo de una acción        | abajo a la derecha, ≤ 3 apilados, el de error no se cierra solo, ≤ 1 acción |
| Registro | lo permanente y copiable: lo que hizo la red o el proceso | una entrada en la superficie donde vive lo que vuelve                       |

- Todo error de conexión es una entrada del registro: resolución, TLS, rechazo, tiempo agotado,
  cierre anómalo, reintentos agotados.
- Sin banner, sin alerta dentro de un panel, sin texto rojo bajo un campo, sin franja sobre el
  contenido.

## Lo que falta no bloquea

Esto no es un formulario. Una variable sin definir, un dato que falta o un valor raro nunca
deshabilita un botón, pinta un campo de rojo ni detiene un envío, una conexión o una
importación: el texto sale tal como está escrito, y lo que conteste el otro lado es del usuario.

- Se bloquea solo lo que **no puede salir** (una dirección que no es absoluta) y lo que protege
  (lo que cambiaría el destino de una credencial), diciendo qué es.
- Una validación opcional avisa con una acción «de todos modos»; nunca cierra el paso.
- Validar al salir del campo o al enviar, nunca a cada tecla.
- Importar trae todo lo que el origen trae, tal como viene, y no inventa lo que el origen no dice.
- Entrada tolerante (pegar una URL, un curl, un JSON), salida estricta.

## Rojo y destrucción

- El rojo pinta **lo que ya pasó**. Lo que va a pasar se pinta en rojo una sola vez: el verbo del
  diálogo de confirmación. Ningún otro botón, elemento de menú, fila ni icono rojo.
- Acción destructiva: etiqueta con `…`, confirmación con el verbo en peligro y el foco en la otra
  respuesta, y toast con deshacer cuando se pueda.
- Lo reversible no se confirma: se hace y se ofrece deshacer.
