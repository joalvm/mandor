---
name: testing
description: Estándar de pruebas — TDD en rojo primero, el tipo de test más barato que puede fallar, recursos reales en vez de mocks, consultas por rol, dobles que implementan el contrato y e2e solo entre procesos. Usar al escribir, revisar o depurar cualquier test.
---

# Testing

## Ciclo

1. Nombrar el bug que se teme o la regla que se promete.
2. Elegir el **tipo más barato que puede fallar** por ese bug (tabla abajo).
3. Escribir el test y verlo **rojo por el motivo correcto** (el mensaje nombra la regla, no un
   import roto).
4. Código mínimo hasta verde. Refactor con verde.
5. Archivo nuevo de código → su test en el mismo commit, que lo nombra y lo ejercita. Sin
   excepción por tamaño. Si solo envuelve una API de plataforma, el test de su consumidor lo
   importa con un doble de esa API.

Un test que nunca se vio rojo no prueba nada. Un test que nombra el archivo sin ejercitarlo
tampoco: se comprueba rompiendo el código a propósito.

## Tipos

| Tipo        | Entorno           | Prueba                                     |
| ----------- | ----------------- | ------------------------------------------ |
| `unit-node` | node              | lógica pura: dominio, parsers, transportes |
| `unit-dom`  | jsdom             | componentes, stores, selectores            |
| `fs`        | node + disco temp | persistencia real                          |
| `git`       | node + repos temp | operaciones git reales, remoto bare local  |
| `contract`  | jsdom + doble IPC | una feature contra el contrato del puente  |
| `e2e`       | app empaquetada   | solo caminos que cruzan procesos           |

Un e2e que comprueba una regla de dominio es un unit lento y frágil. Los tests reflejan las
carpetas del código que prueban.

## Recursos reales

- **Disco**: directorio de `mkdtemp`, borrado en `afterEach`. El sujeto recibe la raíz por
  parámetro; si lee su ruta de la plataforma, el defecto es de diseño. Se afirma leyendo el
  archivo, nunca contando llamadas a `writeFile`.
- **Git**: repos reales en temp, remoto = repo bare local, identidad fija por repo, cero red.
  Dos clones del mismo bare son dos usuarios. Un conflicto se provoca editando el mismo campo
  del mismo archivo en ambos.
- **Store**: la instancia real, reiniciada en `beforeEach`. Un store aislado se crea con su
  fábrica.
- **Editor de código y librerías de UI**: los reales, con los polyfills que jsdom necesite en el
  setup global.
- Rutas con `join`; la suite corre en Windows, macOS y Linux.

Se sustituye solo lo que no existe en el entorno: el puente IPC en jsdom (doble global) y el
módulo del runtime de escritorio en node (`vi.mock` del módulo, con doble tipado). Ningún test
unitario depende de un binario que solo baja una instalación con scripts: si el entorno no lo
trae, el runner lo resuelve a un módulo vacío.

## Dobles

- El doble **implementa el tipo del contrato**. Si el contrato gana una operación, el doble deja
  de compilar: ese es su valor.
- El doble recibe **lo que el puente envía de verdad** (si el preload manda `{}`, el test manda
  `{}`), no el valor que te gustaría.
- Un solo doble compartido, instalado por el setup global; el test que quiere ver qué cruzó lo
  espía (`vi.spyOn`). Nada de `vi.mock` sobre la ruta de un módulo puente dentro de jsdom.
- Caminos de error: devolver `{ ok: false, error: { code } }` y afirmar el mensaje traducido de
  ese `code`, nunca el `message` crudo.
- Una suscripción devuelve su baja, y el test comprueba que se llama al desmontar.

## Afirmar y consultar

- Se afirma el **efecto observable**: texto en pantalla, archivo en disco, estado del store,
  mensaje enviado. Nunca llamadas internas ni estructura del DOM.
- Orden de consulta:
    1. rol y nombre accesible (`getByRole`, `getByLabelText`);
    2. `data-part` a través del ayudante del paquete de UI, que falla nombrando la parte ausente;
    3. texto visible, solo cuando el texto es lo que se prueba.
- Nunca por clase CSS, `id` ni `data-testid`. Si hace falta `data-part` donde debería bastar un
  rol, al componente le falta un rol o una etiqueta.
- Ausencia: `queryBy…` + `toBeNull()`.
- Una consulta no puede aceptar el estado contrario. Con etiquetas solapadas, usar coincidencia
  exacta o una expresión anclada y comprobar que el estado inicial no satisface la espera final.
  Playwright busca por fragmento con `name` de texto: `Connected` también encuentra `Disconnected`.
- Avisos y anuncios accesibles pueden repetir el mismo texto. Acotar la consulta a la región
  visible que pertenece al flujo; no usar `.first()` para esconder la ambigüedad.
- `fireEvent`, no `userEvent`. Esperas por condición, nunca por tiempo:
    - la condición identifica el resultado terminal de la operación, con su intento o id;
      un estado transitorio con el mismo nombre no basta. Si se comprueba una secuencia de
      eventos, se espera la secuencia completa, no una señal que pueda precederla;
    - una petición en vuelo se espera en el servidor de prueba, que anota lo que le llega;
    - una dependencia lenta se simula con una compuerta (una promesa que el test resuelve);
    - una ausencia se prueba enviando un marcador detrás y esperando al marcador;
    - ceder un turno (`setTimeout(r, 0)`) no es esperar. Si el tiempo **es** el sujeto, el
      motivo va escrito encima, con la marca que el repo exija.
- Componentes: se monta la raíz de la feature, no el hijo suelto. Fixtures con las fábricas
  reales y ids cortos y fijos.
- Selectores: se prueba el resultado y la **identidad** (dos lecturas sin cambios devuelven la
  misma referencia).

## La ventana y las actualizaciones de React

Un aviso de `not wrapped in act(...)` no se calla ni se ignora: señala una escritura de estado
que el usuario no ve llegar. Se arregla haciendo que el cambio caiga donde cae el de verdad.

- **La ventana baja antes de que el estado se desmonte.** El auto-cleanup de Testing Library
  corre después de los `afterEach` del fichero: un `reset()` de store, un unregister o un
  restore que escribe, con el árbol montado, es una actualización fuera de `act`. `cleanup()`
  es la primera línea de todo `afterEach` que toca estado.
- **Las respuestas que la vista espera al montar caen dentro de `act`.** Semillas, listas y
  cargas iniciales llegan en una promesa que resuelve después del `render`. O el disparador
  corre dentro de `await act(async () => { … })`, o tras el `render`/la interacción sigue un
  vaciado (`await act(async () => {})`).
- **Los eventos crudos no bastan.** `dispatchEvent`, `new Event` y `.click()` del DOM no
  envuelven en `act` como lo hace `fireEvent`; si el ayudante de testing despacha a mano,
  envuelve la secuencia en `act`.
- **Lo que la vista difiere, el test lo vacía.** Un debounced, un `requestAnimationFrame`, un
  timer que responde una frame más tarde se vacía dentro de `act`: con timers reales, await
  del frame dentro de `act`; con `vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync(…)`
  dentro de `act`, y `vi.useRealTimers()` al salir para no arrastrarlos al test siguiente.
- **El aviso que sale en un test puede nacer en el anterior.** Los writes del `afterEach` y
  de las bajas de suscripciones caen con el encabezado del test siguiente; si el test limpio
  avisa, mira el teardown del que le precede.

## Suite compartida

Los archivos de un worker pueden compartir módulos y ventana: es lo que hace rápida una suite
grande. El precio es que todo lo global que un test toca llega al siguiente.

- Lo que un test monta a mano, lo desmonta: editores, documentos, listeners, servidores, timers.
- Stores, almacenamiento, dobles globales y el estado de módulo del proceso (la sesión, lo que
  aprendió) vuelven a su estado de nacimiento entre archivos, en el setup global, no en cada
  test.
- Lo que el código difiere con un temporizador y sigue pendiente al acabar el archivo corre antes
  del siguiente, en el setup: una escritura diferida que cae en otro archivo falla un test que no
  hizo nada, y solo cuando el reloj lo permite.
- Un archivo que reemplaza módulos o prueba la primera carga de uno corre aislado y lo declara.
  La clasificación del runner debe cubrir las formas de reemplazo admitidas y ejecutar cada
  archivo exactamente una vez, tanto los compartidos como los aislados.
- La consola es una aserción: un error o un aviso que nadie esperaba hace fallar el test.
- Un test que pasa solo y falla junto a otros exige distinguir contaminación, carga y carreras.
  Para contaminación se baraja el orden con semillas registradas; para una carrera se repite
  el escenario mínimo bajo la carga que la reproduce. Un reintento verde no demuestra corrección.

## Coste y determinismo

1. **Medir antes de elegir tecnología.** Registrar runner, versiones, sistema, CPU, workers,
   aislamiento, cobertura y comando. Separar instalación, setup, importación y ejecución;
   distinguir duración real de sumas y porcentajes agregados entre workers. Perfilar el tramo
   dominante antes de migrar framework, cambiar entorno o añadir paralelismo.
2. **Fixture mínimo sensible.** Usar el menor dato que alcance la regla, su límite o la carrera.
   Reducir volumen conserva el umbral y las aserciones; romper la regla debe seguir poniendo
   el test rojo. Si el tamaño extremo es el requisito, conservar una prueba de escala explícita;
   si solo se mide rendimiento, usar un benchmark separado.
   La prueba de una gramática usa datos propios: una cadena accidental de un script del repo
   no es un fixture estable. Los procesos hijos reciben un entorno controlado, incluidas las
   variantes de mayúsculas de las claves en Windows.
3. **Comparar lo mismo.** Cambiar una variable y medir antes y después con igual entorno,
   alcance y cobertura. Hacer 2–3 corridas por variante, distinguir caché fría y caliente y
   registrar dispersión; usar semillas conocidas al comprobar independencia del orden.
4. **Conservar la garantía.** No acelerar quitando aserciones, bajando cobertura, saltando tests
   ni sustituyendo recursos reales por mocks indiscriminados. Timeouts mayores no optimizan.
   Un cambio de workers o aislamiento requiere comprobar cleanup y orden; el sharding requiere
   reunir resultados y cobertura antes de aplicar sus umbrales.

El informe da comando, condiciones, tiempos comparables, fallos y alcance pendiente. Una mejora
local no acredita el tiempo de GitHub Actions; la corrida del runner confirma el resultado allí.

## Lo que el gate no deja pasar

- Un test enfocado (`.only`) en el árbol.
- Un test saltado sin su motivo escrito junto al salto.
- Un archivo con forma de test donde ningún runner mira: no corre, y nadie lo nota.
- Un archivo de un paquete con umbral cubierto solo por tests de otra capa: no tiene test propio.
- Un test que no llega a ninguna aserción del runner: solo llama, su `expect` vive en un callback
  que nunca corre, o su bucle no tenía nada que recorrer.
- Una aserción de tipos mezclada con tests que corren: los tipos van en un archivo que solo lee
  el compilador, y ahí no cabe una aserción de ejecución, que nadie evaluaría.
- Una librería que afirma por su cuenta (`node:assert`) sin envolver: el runner no la cuenta; el
  envoltorio convierte su ejecución en una aserción.

## Nombres

- `describe` por comportamiento (`'creating workspaces'`), no por función.
- `it` en inglés, tercera persona, enunciando la regla:
  `it('keeps unknown keys when another app rewrites the file')`.
- JSDoc de una línea sobre el `it` cuando la regla tiene un porqué.

## E2E

- Directorio de datos de usuario y repo de trabajo temporales, creados por la prueba.
- Todo dentro de `try/finally`: cerrar la app y borrar temporales pase lo que pase.
- Servidores de prueba locales en puerto efímero. Cero servicios externos.
- Esperar por condición (`expect(locator).toBeVisible()`).
- Geometría o CSS calculado (`boundingBox()`, `toHaveCSS`) solo cuando el estilo **es** el
  requisito, con comentario. Lo que la spec da en píxeles se mide aquí.
- Antes de leer el color de algo recién pulsado, mover el puntero fuera.
- El e2e de un flujo con persistencia cierra y reabre la app y comprueba que todo sigue.
- Test intermitente: se corrige su causa y se conserva la protección. Retirarlo exige cobertura
  equivalente demostrada. Reintentar lo esconde: en CI, un reintento como mucho, y el informe
  lo nombra.
- Abrir y cerrar la app tienen presupuesto propio; una que no cierra a tiempo se termina con todo
  su árbol de procesos. Los temporales se borran con reintentos: Windows retiene archivos un rato.
- La corrida se corta tras pocos fallos en CI: una app que no abre falla igual en cada test.

## Cobertura

Umbral numérico en todo paquete puro, y solo ahí.
En features y apps el umbral premia tests vacíos; ahí la garantía es «todo archivo nuevo llega
con su test».

## Tests que protegen datos del usuario

Round-trip de formato de disco (comentarios, claves desconocidas, orden) · escritura atómica
(un fallo a mitad no trunca el destino) · rechazo de ids con `..` o separadores · fusión de tres
vías, si la hay (limpio, conflicto de campo, borrado contra edición) · ausencia de `--force` en
el código git · ningún secreto en el árbol tras guardar · drift entre esquemas generados y
fuente.
