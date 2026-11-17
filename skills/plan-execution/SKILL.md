---
name: plan-execution
description: Ejecuta una fase de un plan versionado — baseline reutilizable, primera fase sin marcar, check antes que código, TDD, escalera de gates sin repeticiones, verificación visual y un commit por fase. Usar antes de tocar código para cualquier tarea que venga de un plan.
---

# Plan execution

Una fase está hecha cuando una máquina comprueba que existe y alguien miró el resultado. Antes,
es una opinión.

## Antes del código

1. **Baseline.** Si la fase anterior cerró en verde y la base no cambió desde entonces, ese
   cierre **es** la baseline: no se repite. Si no, **verify** una vez con el árbol limpio y se
   anota lo que ya falla. Sin baseline, cualquier rojo posterior es tuyo.
2. Leer contexto, decisiones y criterios del plan, la fase entera y, de las siguientes, solo
   título y objetivo: explican por qué esta se corta donde se corta.
3. En el índice del hito: todo prerequisito en `hecho` o `sustituido`.
4. Tomar la **primera fase sin marcar**. Nada de fases posteriores, aunque parezca obvio.
5. Su bloque `check` debe fallar entero; el gate no evalúa fases sin marcar, así que se
   comprueba a mano (un `ls` o una búsqueda por línea). Si falta, se escribe ahora: escrito
   después describe lo que salió, no lo que se pedía.
6. Si la fase toca algo visible, cargar la skill de diseño. Si no, no.

## Durante

- **Alcance** = lo que dice la fase. Lo que está en «no hacer» no se hace.
- **TDD**: test primero, visto en rojo por el motivo correcto (corriendo solo ese archivo);
  luego el código mínimo.
- **Archivo nuevo nace con su test** en el mismo commit, sin excepción por tamaño.
- Librería antes que módulo propio (criterio de la skill de planes).
- Lo compartido se registra en todas las apps que lo usan, en esta misma fase.
- Lo que el plan difiere entra como parámetro tipado con su valor por defecto escrito en la
  llamada.
- Fase imposible tal como está escrita: parar y explicar por qué. El plan no se reinterpreta
  en silencio.
- **Hallazgo fuera de alcance**: una línea en la sección de deudas del plan. Ni se arregla (ensucia
  el diff) ni se calla (se pierde).

## Escalera de gates

Cada gate responde una pregunta distinta; correr uno más caro antes de tiempo da la misma
respuesta, más tarde.

| Gate                | Cuándo                                       | Alcance           |
| ------------------- | -------------------------------------------- | ----------------- |
| test de un archivo  | ciclo TDD                                    | ese archivo       |
| **check**           | tras cada bloque coherente de edición        | rutas tocadas     |
| **verify**          | una vez, al cerrar la fase                   | repo entero       |
| gate de integración | una vez, tras el último commit, antes del PR | QA + verify + e2e |

- **Un gate en verde no se repite sin cambios** en medio. Rojo → se corrige y se repite solo ese
  gate, no la escalera entera.
- **Medición o intermitencia:** se permite repetir el alcance mínimo con configuración y semillas
  registradas para comparar tiempos o reproducir una carrera; seguir la skill de testing.
  Es un experimento acotado, no una repetición de verify entero ni un reintento para obtener verde.
- En la última fase del plan, el gate de integración tras su commit hace de verify: no se corren
  los dos.
- Si el gate corre en contenedor y tarda minutos, se agrupan las ediciones antes de lanzarlo. Lo
  que el contenedor arregla (formato) no vuelve al árbol: se formatea en local antes.
- De la salida se lee el fallo, no el log entero: filtrar por error y leer el primero.

## Verificación visual

Si la fase cambia algo que se ve, no está cerrada hasta mirarlo:

1. Arrancar en modo desarrollo **cada app** que registra la pieza.
2. Mirar en claro y oscuro, con la spec de esa pieza al lado.
3. Recorrer cada estado que la spec nombra: reposo, hover, foco, activo, deshabilitado, vacío,
   error.
4. Lo que la spec da en píxeles se fija en un e2e que mide, no a ojo.
5. Cerrar la app. Un proceso de escritorio suelto sigue vivo días después.

## Cierre de fase

En orden:

1. Regenerar todo artefacto derivado que la fase dejó atrás (esquemas, textos, tokens, iconos)
   e incluirlo.
2. Auditoría del diff: secretos fuera del árbol, esquemas de URL validados, timers y listeners
   con cleanup, nada vivo tras cerrar la vista, rutas con `join`.
3. Marcar `[x]` la fase y ajustar la fila del índice: la fila **siempre** refleja las marcas
   (`pendiente` sin marcas, `en curso` con alguna, `hecho` con todas).
4. **verify** entero, ya con la marca: es lo que hace correr el bloque `check` de la fase.
5. Un commit por fase (skill de git).
6. Reindexar la memoria de código solo si no se refresca sola.
7. Parar y reportar. La fase siguiente empieza cuando el usuario lo dice.

**Cierre de plan**: todas las fases marcadas, fila en `hecho`, gate de integración verde sobre
los SHA finales, PR con squash, rama y worktree borrados.

## Fallos típicos

| Error                                        | Consecuencia                           |
| -------------------------------------------- | -------------------------------------- |
| `[x]` sin bloque `check` o con gate rojo     | «Hecho» vuelve a ser opinión           |
| Marca sin mover la fila del índice           | El gate de planes en rojo              |
| `check` escrito después del código           | Describe lo que salió, no lo pedido    |
| Dos fases en un commit                       | El revisor no puede aislar el fallo    |
| Test escrito después                         | No se sabe si el test prueba algo      |
| verify dentro del bucle, o repetido en verde | Minutos gastados en la misma respuesta |
| Cerrar una fase visible sin abrir la app     | Estados y holguras que nadie miró      |
| Registrar en una app y «adaptar luego»       | La otra app queda rota sin que se vea  |
| Paquete o capa que el plan no pide           | Alcance que nadie pidió ni revisó      |
