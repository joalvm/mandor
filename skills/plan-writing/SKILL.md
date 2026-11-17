---
name: plan-writing
description: Convierte una idea ya aceptada en un plan corto y verificable — problema antes que herramienta, librerías antes que código, fases con bloque check que hoy falla. Usar al escribir, partir o revisar un plan de implementación.
---

# Plan writing

Un plan bueno no impresiona: aclara. Se escribe para un agente que no estuvo en la conversación.

Esta skill ordena un cambio cuya conveniencia ya está decidida. Si todavía se duda de que
convenga, primero se pregunta al usuario.

## Pasos

1. **Anclar el estado actual.** Buscar primero, abrir después, y solo los rangos que se citan:
   rutas, contratos y líneas. Si una spec dice otra cosa que el código, el plan lo señala y lo
   corrige; una spec escrita sin abrir el archivo no manda sobre el archivo.
2. **Nombrar el dolor de hoy**, la ganancia buscada y lo que queda fuera. Lo que se prevé para
   el futuro no justifica trabajo hoy.
3. **Librerías antes que código** (sección obligatoria, antes de la primera fase). Para cada
   pieza: candidata, decisión y motivo. Cada candidata que entra lleva versión exacta, licencia
   y fecha de publicación leídas del registro en ese momento:

    ```bash
    npm view <paquete> version time.modified license
    ```

    Sin publicar en doce meses, o en `alpha`/`beta`: no entra sin motivo escrito. Versión fijada
    exacta, sin rango. Si no entra ninguna, la sección dice por qué: escribir a mano pide la misma
    justificación que añadir una dependencia.

4. **Dónde vive cada pieza.** En un monorepo con varias apps: lo que sirve a más de una va a un
   paquete compartido y todas las apps lo registran en el mismo PR. Lo que se queda en una app
   cita la diferencia documentada que lo justifica; sin esa diferencia, es compartido.
5. **Criterios de entrada** para cada paquete, capa o dependencia nueva: qué consumidores reales
   la piden (dos, salvo la excepción que fijen las reglas del repo), o qué umbral medido en un
   spike la justifica.
6. **Partir en fases** y escribir el bloque `check` de cada una (abajo).
7. **Comprobar que cada línea falla hoy.** El gate no evalúa fases sin marcar, así que se
   comprueba a mano: un `ls` o una búsqueda por línea. Una línea en verde el día que se escribe
   comprueba el pasado: se reescribe o se borra.
8. **Indexar el plan** en la tabla de su hito, con prerequisitos y estado `pendiente`.

Hecho cuando: cada fase tiene objetivo, cambios, no hacer, cierre y un bloque `check` rojo
entero; la sección de librerías tiene decisión para cada pieza; y la fila del índice existe.

## Fases

- Título exacto `### [ ] Fase N: lo que entrega` (marcado: `[x]` minúscula). Otra forma hace la
  fase invisible al gate. El título es el check; no hay checklist aparte.
- De cuatro a seis fases de trabajo nuevo. Una fase = un commit. Más de seis son dos planes.
  Las fases que saldan deuda de un plan anterior no cuentan para el techo.
- Cada fase se entiende sin saltar a otra sección: **objetivo** (qué se puede hacer al terminar
  que antes no), **cambios** (archivo a archivo), **no hacer** (lo que está a un paso y es de
  otra fase) y **cierre** (comando exacto y, si es visible, qué mirar con la app abierta).
- El cierre usa los comandos de gate que fijan las reglas del repo, y se comprueba que existen
  antes de escribirlos. Un script que parece razonable y no existe es un cierre falso.
- Parámetros que cablea un plan posterior entran tipados, con el valor por defecto escrito en
  la llamada y un comentario que nombra quién lo cablea.

## Bloque `check`

Lo que un tercero comprueba sin leer el diff. Ocho verbos, tres tokens como mucho, nada ejecuta:

| Verbo      | Comprueba                                |
| ---------- | ---------------------------------------- |
| `file`     | la ruta existe                           |
| `no-file`  | la ruta ya no existe                     |
| `contains` | el archivo dice el literal               |
| `absent`   | el archivo ya no lo dice                 |
| `matches`  | algo bajo la ruta casa con la expresión  |
| `no-match` | nada bajo la ruta casa con ella          |
| `exports`  | el barril del paquete exporta el símbolo |
| `tested`   | algún test del paquete nombra el archivo |

Una línea: `verbo ruta [valor]`; con `exports`, `exports <paquete> <símbolo>`. Ruta sin
espacios; `"literal"`, `/expresión/` sin flags; `#` comenta. Un solo bloque por fase.

- `tested` por cada archivo de código fuente que la fase hace nacer en un paquete o app, con las
  mismas exenciones que el gate de QA (barril, declaraciones, utilidades de test).
- Lo que no cabe en ocho verbos es un test, no un check.
- Una fase cuyo bloque no se puede escribir sin inventar rutas no está diseñada todavía.

## Escalera de soluciones

Se sube un peldaño solo cuando el anterior no alcanza:

1. Cambio local y reversible.
2. Separación por responsabilidad real.
3. Módulo o flujo extraído con dueño claro.
4. Capa o dependencia nueva.

## Señales de plan malo

Más tecnología que problema · fases por simetría · lenguaje abstracto sin rutas ni contratos ·
pasos que asumen crecimiento no probado · cierre blando («queda más limpio») · checks que ya
pasan · estructura nueva sin dolor que la pida.
