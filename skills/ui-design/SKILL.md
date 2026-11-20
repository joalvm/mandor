---
name: ui-design
description: Estándar de diseño de interfaz para una herramienta de escritorio densa (cliente de API, editor, consola) — marco y tarjetas, superficies y estados neutros, radio, tipografía, densidad, bandas, componentes con todos sus estados, foco, superposiciones sólidas, avisos y tokens. Usar al crear, cambiar o revisar cualquier cosa visible, un componente, un token, un tema, una pantalla o una interacción.
---

# UI design

Una herramienta de escritorio no es una página web con formularios. Se usa horas seguidas, con
teclado, en paneles que el usuario dimensiona. El estándar es el de las herramientas de
desarrollo actuales: un **marco** quieto, el trabajo en **tarjetas** encima, estados en gris, un
solo acento y respuesta inmediata.

Cómo se escribe el archivo del componente → skill de componentes React. Los glifos propios →
skill de iconografía. Aquí: cómo se ve, cómo se arma y cómo se usa.

## Principios

1. **Marco y tarjetas.** La ventana es un marco: barra de título, lateral, tira de pestañas y
   barra de estado viven en él. El contenido va en tarjetas sobre el marco, separadas por el
   hueco y por el tono, nunca por una línea.
2. **El contenido gana; el cromo cede.** Lo que el usuario escribe o recibe tiene el contraste
   más alto. El marco y lo que vive en él bajan un escalón.
3. **Estados en gris.** Puntero, seleccionado y activo son pasos de gris apenas distinguibles. El
   acento no marca estado: solo la acción primaria, lo encendido (casilla, interruptor), la marca
   de la app y el foco.
4. **Blanco sólido, gris para controles.** Tarjetas, tablas, grupos, árboles, menús y popovers
   son superficie sólida (blanca en claro). El gris de relleno es de los controles. Nada de vidrio
   ni desenfoque.
5. **Un valor por decisión.** Alturas, radios, huecos, anchos, colores y tiempos salen de una
   escala con nombre. Ningún número suelto en un componente.
6. **El teclado es el camino.** Todo se alcanza y se opera sin ratón; el foco siempre se ve y
   nunca sale de la caja del control.
7. **Nada bloquea.** La herramienta envía lo que el usuario escribió. Se detiene solo lo que no
   puede salir o lo que protege datos.
8. **Convención antes que invento.** Si el patrón ya existe en las herramientas que el usuario
   conoce, se copia su forma.

## Decisiones rápidas

| Pregunta                      | Respuesta                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| ¿Dónde va un contenido?       | En una tarjeta sobre el marco. El cromo va en el marco. Nunca tarjeta dentro de tarjeta.             |
| ¿Qué separa dos zonas?        | El hueco del marco entre tarjetas. Dentro de una tarjeta, espacio y tono; línea solo si se arrastra. |
| ¿Radio?                       | Control y fila 3 · pestaña 6 · tarjeta, menú y popover 10 · diálogo y aviso 12 · compacta 0.         |
| ¿Sombra?                      | Solo lo que flota. Las tarjetas no llevan: las separa el tono.                                       |
| ¿Altura?                      | Control 28 · fila 24 · pestaña 28 en tira de 38 · barra de título 40 · control en diálogo 32.        |
| ¿Texto base?                  | 13 px, la misma familia en toda la interfaz, URL y tablas incluidas; monoespaciada solo en código.   |
| ¿Color de un estado?          | Gris: velo al apuntar, un paso más para seleccionado. Nunca el acento.                               |
| ¿Elegir un valor guardado?    | Desplegable: control relleno con el valor y un chevrón; > 10 opciones, con búsqueda.                 |
| ¿Ejecutar una orden?          | Menú, o la paleta desde el centro de comandos. Termina en `…` si abre otro paso.                     |
| ¿Algo que tiene sus diálogos? | Pestaña, no diálogo: nunca un diálogo sobre otro.                                                    |
| ¿Editar un dato corto?        | En sitio. Nunca un diálogo para un campo.                                                            |
| ¿Confirmar?                   | Solo lo irreversible, en un diálogo de alerta sin icono. Lo reversible se hace y ofrece deshacer.    |
| ¿Avisar?                      | Efímero → aviso flotante. Permanente → el registro donde vive lo que pasó.                           |

## Referencias

Cargar la del área que se toca; cada una es completa en lo suyo.

| Archivo                                     | Cubre                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [visual.md](references/visual.md)           | color, contraste, superficies, bordes, sombras, radio, tipografía, iconos, movimiento    |
| [layout.md](references/layout.md)           | marco, tarjetas, pestaña de trabajo, bandas, densidad, ritmo, encoger y desplazar        |
| [components.md](references/components.md)   | capas, variantes, estados, foco, marcado, roles, teclado, pestañas y tablas              |
| [interaction.md](references/interaction.md) | superposiciones, diálogos, menús, paleta, edición en sitio, avisos, bloqueo, destrucción |
| [tokens.md](references/tokens.md)           | capas de tokens, nombres, escalas, densidad y temas                                      |

## Señales de pantalla mal hecha

Si aparece una, la pantalla está mal antes de mirar nada más:

- Contenido pintado directamente sobre el marco, o cromo (pestañas, lateral) metido en una tarjeta.
- Tarjeta dentro de tarjeta; borde alrededor de una tarjeta; línea donde basta el hueco.
- Selección, fila activa o pestaña activa en el color de acento; más de un acento.
- Anillo de foco por fuera de la caja, `outline`, o un borde que cambia de grosor al enfocar.
- Gris de panel bajo una tabla, un árbol o un menú; vidrio, desenfoque o degradado.
- Botones o pestañas en píldora; radios fuera de la escalera; mismo radio en padre e hijo.
- Campos con borde y sombra en reposo; etiqueta encima de cada campo y «Guardar» al pie.
- Un diálogo abierto desde otro; icono o insignia de tono en un diálogo de alerta.
- Cromo que envuelve a dos líneas: barra de título, pestañas, bandas o botones.
- Botones deshabilitados sin motivo, campos rojos que impiden enviar, validación a cada tecla.
- Animación en lo que se hace cien veces al día o se dispara con teclado.

## Antes de cerrar

- [ ] El cromo vive en el marco; cada contenido, en su tarjeta; ninguna tarjeta anidada.
- [ ] Cada valor sale de una escala con nombre: altura, radio, hueco, ancho, color, tiempo.
- [ ] Estados en gris; acento solo en primaria, encendido, marca y foco.
- [ ] Superficies sólidas; gris de relleno solo en controles; sombra solo en lo que flota.
- [ ] Cada banda: altura por token, una línea, contenido centrado en vertical, relleno por token.
- [ ] Cada componente con todos sus estados (components.md), en claro, oscuro y contraste.
- [ ] Contraste medido: texto 4.5:1; foco, iconos con sentido y bordes que identifican, 3:1.
- [ ] Todo operable con teclado; foco dentro de la caja; el foco vuelve al cerrar una capa.
- [ ] Superposición elegida por la tabla, con sus tiempos; ningún diálogo sobre otro.
- [ ] Densidad compacta revisada: sin hueco ni radio, con líneas entre zonas.
- [ ] Nada bloquea lo que puede salir; el rojo solo pinta lo que ya pasó.
