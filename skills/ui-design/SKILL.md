---
name: ui-design
description: Estándar de diseño de interfaz para una herramienta de escritorio densa (cliente de API, editor, consola) — color y superficies, radio y bordes, tipografía, densidad, maquetación en zonas y bandas, componentes en capas con todos sus estados, marcado y teclado, superposiciones con tiempos, avisos y tokens. Usar al crear, cambiar o revisar cualquier cosa visible, un componente, un token, un tema o una interacción.
---

# UI design

Una herramienta de escritorio no es una página web con formularios. Se usa horas seguidas, con
teclado, en paneles que el usuario dimensiona. El estándar es el de las herramientas de
desarrollo actuales: densa, neutra, plana en reposo, con un solo acento y respuesta inmediata.

Cómo se escribe el archivo del componente → skill de componentes React. Los glifos → skill de
iconografía. Aquí: cómo se ve, cómo se arma y cómo se usa.

## Principios

1. **El contenido gana; el cromo cede.** Lo que el usuario escribe o recibe tiene el contraste
   más alto. Barras, laterales y bordes bajan un escalón.
2. **Planos en reposo, vivos al usarse.** Un control sin uso no dibuja caja; el fondo aparece al
   apuntar, al abrir o al enfocar.
3. **Agrupar con espacio antes que con líneas.** Proximidad → región común → línea, en ese
   orden. Una línea solo separa dos zonas de la ventana.
4. **Un valor por decisión.** Alturas, radios, huecos, colores y tiempos salen de una escala con
   nombre. Ningún número suelto en un componente.
5. **El teclado es el camino.** Todo se alcanza y se opera sin ratón; el foco siempre se ve.
6. **Nada bloquea.** La herramienta envía lo que el usuario escribió. Se detiene solo lo que no
   puede salir o lo que protege datos.
7. **Convención antes que invento.** Si el patrón ya existe en las herramientas que el usuario
   conoce, se copia su forma.

## Decisiones rápidas

| Pregunta                    | Respuesta                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| ¿Radio de un control?       | 3 px (2 si mide < 20 px). Menú y popover 4. Diálogo 6. Barras pegadas al borde 0.                 |
| ¿Borde?                     | Solo entre zonas. Dentro de una zona, superficie y espacio.                                       |
| ¿Sombra?                    | Solo en lo que flota (menú, popover, diálogo, toast). Lo fijo, nunca.                             |
| ¿Altura de control?         | 24 px en bandas, 26–28 en formularios. Fila de lista 24. Banda = control + 8.                     |
| ¿Texto base?                | 13 px; meta 12; suelo 10–11. Números que cambian, cifras tabulares.                               |
| ¿Color de acento?           | Foco, selección, activo y acción primaria. Nada más.                                              |
| ¿Elegir un valor guardado?  | Desplegable: botón plano con el valor y un chevrón; > 10 opciones, con búsqueda.                  |
| ¿Ejecutar una orden?        | Menú. Termina en `…` si abre otro paso.                                                           |
| ¿Explicar un dato al pasar? | Tarjeta flotante: abre tras 400 ms de reposo, cierra 150 ms después de salir. El clic no la fija. |
| ¿Nombrar un icono?          | Tooltip: 400 ms el primero, 0 ms los vecinos durante 300 ms.                                      |
| ¿Editar un dato corto?      | En sitio. Nunca un diálogo para un campo.                                                         |
| ¿Confirmar?                 | Solo lo irreversible. Lo reversible se hace y ofrece deshacer.                                    |
| ¿Avisar?                    | Efímero → toast. Permanente → el registro donde vive lo que pasó.                                 |

## Referencias

Cargar la del área que se toca; cada una es completa en lo suyo.

| Archivo                                     | Cubre                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| [visual.md](references/visual.md)           | color, contraste, superficies, bordes, sombras, radio, tipografía, iconos, movimiento |
| [layout.md](references/layout.md)           | ventana, zonas, bandas, densidad, ritmo, encoger y desplazar                          |
| [components.md](references/components.md)   | capas, variantes, estados, marcado, roles y teclado                                   |
| [interaction.md](references/interaction.md) | superposiciones y tiempos, edición en sitio, avisos, bloqueo, destrucción             |
| [tokens.md](references/tokens.md)           | capas de tokens, nombres, escalas, temas                                              |

## La apariencia de formulario web

Si aparece uno de estos, la pantalla está mal antes de mirar nada más:

- Radio de 8 px o más en controles, filas o pestañas; botones o pestañas en píldora.
- Cada campo encerrado en caja con borde, relleno y sombra en reposo.
- Bordes de 1 px entre cada elemento; borde de panel más borde de tarjeta; tarjetas dentro de
  tarjetas.
- Relleno de 16–24 px en filas y controles; controles de 36–48 px; una columna centrada con
  ancho máximo.
- Etiqueta encima de cada campo y un botón «Guardar» al pie, en vez de editar en sitio.
- Sombras en paneles fijos; degradados; desenfoque decorativo; bordes de color a la izquierda.
- Gris sobre gris sin contraste; más de un acento; rojo como énfasis; iconos de colores sin
  significado.
- Botones deshabilitados sin motivo, campos rojos que impiden enviar, validación a cada tecla.
- Animación en lo que se hace cien veces al día o se dispara con teclado.

## Antes de cerrar

- [ ] Cada valor sale de una escala con nombre: altura, radio, hueco, color, tiempo.
- [ ] Ningún borde que no separe zonas; ninguna sombra en lo fijo; radios del ladder.
- [ ] Controles planos en reposo; el fondo aparece al apuntar, abrir o enfocar.
- [ ] Cada banda: altura por token, contenido centrado en vertical, relleno lateral por token.
- [ ] Cada componente con todos sus estados (components.md), claro y oscuro revisados.
- [ ] Contraste medido: texto 4.5:1, bordes de control y estados 3:1.
- [ ] Todo operable con teclado; foco visible; el foco vuelve al cerrar una capa.
- [ ] Superposición elegida por la tabla y con sus tiempos; ningún diálogo sin motivo.
- [ ] Nada bloquea lo que puede salir; el rojo solo pinta lo que ya pasó.
