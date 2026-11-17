---
name: code-style
description: Estándar de escritura TypeScript — un archivo una idea, forma de función en bloques, guardas, techos de complejidad, tipos estrictos, nombres, errores y comentarios; implementar en vez de parchear. Usar al escribir, revisar o refactorizar cualquier archivo .ts o .tsx.
---

# Code style

Lo mecánico lo decide el linter y el formateador. Esto es lo que decide quien escribe, y lo
que el linter comprueba explicado para no pelearse con él. Una regla de lint mala se discute;
no se rodea. `eslint-disable-next-line <regla>` solo donde el lenguaje o una API sin
alternativa lo obliga, con un comentario encima que dice por qué.

## Archivo

**Un archivo, una idea.** Test: ¿el nombre del archivo describe **todo** lo que exporta? Si al
resumirlo aparece «y además», ahí está el corte: dos archivos.

Pueden compartir archivo:

- una función y el tipo de su entrada;
- una constante y el tipo derivado de ella (`(typeof X)[number]`);
- varias operaciones sobre el mismo dato (se llama por el dato: `path-id.ts`);
- una función pública y sus auxiliares privadas.

Siempre aparte: **cada clase de error**, sola en su archivo y nombrada como ella
(`format-error.ts` → `FormatError`).

- Nombre en kebab-case, igual que lo que exporta: `parse-repo.ts` → `parseRepo`. Componentes
  `PascalCase.tsx`; hooks `useThing.ts`. Pieza de un patrón repetido: sufijo de rol con punto
  (`things.slice.ts`, `repo.handlers.ts`).
- Nombres de categoría prohibidos (`utils`, `helpers`, `common`, `shared`, `misc`, `types`,
  `constants`, `errors`): aceptan cualquier cosa y se vuelven cajón.
- `export` solo lo que se usa fuera del archivo. Lo demás, sin `export`.
- Exports con nombre. `export default` nunca: sin nombre canónico, cada import lo bautiza
  distinto y renombrar deja de propagar.
- Techo de 200 líneas de código (250 en tests). Al acercarse, se busca la costura; no se
  comprime.
- Una auxiliar con un solo consumidor vive en el archivo de ese consumidor. Sacarla a otro
  archivo para caber bajo el techo no es una costura: la costura es otra idea que el archivo
  también hace.

## Imports

```ts
import { simpleGit } from 'simple-git'; // 1. externos
import type { Workspace } from '@scope/schema'; // 2. otros paquetes
import { atomicWrite } from './atomic-write.js'; // 3. relativos
```

- Extensión `.js` en todo import relativo, aunque el archivo sea `.ts`.
- `import type` para lo que solo es tipo; mixto con `type` en línea.
- Fuera de un paquete se importa su barril o una subruta que declare en `exports`; dentro, el
  archivo que define el símbolo. Nunca el propio barril desde dentro.

## Función

Cuatro bloques en orden, separados por una línea en blanco: **declaraciones → guardas →
trabajo → resultado**.

```ts
export function workspacePath(root: string, workspaceId: string): string {
    const trimmed = workspaceId.trim();
    const safe = SEGMENT.test(trimmed);

    if (trimmed.length === 0) {
        throw new WorkspaceIdError('empty');
    }

    if (!safe) {
        throw new WorkspaceIdError(trimmed);
    }

    return join(root, 'workspaces', trimmed);
}
```

- Declaraciones consecutivas, pegadas. Una declaración por sentencia.
- Todo `if`/`for`/`while`/`switch`/`try` aislado por líneas en blanco, guardas seguidas
  incluidas. `return` precedido de línea en blanco.
- Llaves siempre. Guarda con salida temprana; sin `else` tras `return`, sin escaleras
  `else if`, sin ternario anidado, sin condición negada con `else`.
- Techos: profundidad 2, complejidad 10, 20 sentencias, 4 parámetros. Superado un techo, se
  extrae una **función con nombre** por la costura:
    - cadena de `if` que devuelve valores → función que decide (`stateLabel`);
    - bucle que valida y bucle que ensambla → dos funciones;
    - quinto parámetro, o un booleano posicional → objeto con tipo nombrado, desestructurado en
      la firma.

## Tipos

- `type`, nunca `interface` (salvo aumentar una declaración global, que exige fusión).
  `unknown` en los bordes, nunca `any`; se estrecha con una función.
- Variantes = **unión discriminada** (`kind`). Un campo opcional que solo vale para una
  variante es una unión mal modelada.
- Campo opcional solo cuando su ausencia significa algo. Con `exactOptionalPropertyTypes`,
  lo que se pasa explícito se tipa `x?: T | undefined`.
- `readonly T[]` en parámetros que no se mutan.
- Retorno explícito en funciones exportadas, salvo componentes React.
- `as` y `!` no callan al compilador: se arregla el origen del tipo.
- Comparaciones explícitas: `=== undefined`, `=== null`, `.length === 0`, `=== ''`. Nunca
  truthiness sobre valores que pueden ser `0` o `''`.
- Acceso indexado = `T | undefined`: se comprueba antes de usar.
- `String(n)` al interpolar números. Promesa sin esperar: `void p.catch(handle)`.

## Nombres

| Cosa                  | Forma                             |
| --------------------- | --------------------------------- |
| Fábrica               | `createX`                         |
| Selector              | `selectX`, `selectXFor(id)`       |
| Guarda que lanza      | `assertX`                         |
| Disco                 | `readX`, `writeX`                 |
| Parseo con validación | `parseX`                          |
| Registro              | `registerX`, que devuelve su baja |
| Constante de módulo   | `SCREAMING_SNAKE`                 |
| Booleano              | estado (`selected`), no acción    |
| Parámetro sin usar    | `_name`                           |

## Errores

- Dominio y disco lanzan clases de error con nombre y campos útiles.
- A través de un límite de proceso o de API nunca viaja una excepción: viaja
  `{ ok: false, error: { code, message } }`. La UI decide por `code`; `message` va al log.
- Nada se traga en silencio: `catch` que no maneja, relanza o convierte a `Result`.

## Comentarios

- En inglés, sobre el **porqué**: la decisión, el tradeoff, qué se rompe si se hace lo obvio.
- JSDoc de una línea en todo símbolo exportado y en campos no obvios de un tipo.
- Encima de un `useState` o una constante de módulo cuyo motivo no se ve.
- Cero comentarios que repiten el nombre o narran la mecánica.

## Implementar, no parchear

Algo simple que abre una rama por caso es deuda con fecha. Antes de añadir un `if` o un
`switch`, localizar de dónde sale la diferencia:

| La diferencia es…                       | Se implementa como…                    |
| --------------------------------------- | -------------------------------------- |
| Un caso más de algo enumerado           | Una entrada en una tabla cerrada       |
| Un tipo de cosa que el módulo no conoce | Un registro donde quien sabe se apunta |
| Una regla de dominio                    | Una función del dominio                |
| Estado que leen dos sitios              | Un store; cada uno lee lo suyo         |
| Dos conductas de verdad distintas       | Dos funciones con nombre, sin `flag`   |

Señales de parche: un `if` que nombra a un llamador concreto · un `switch` que crece con cada
caso · un booleano que activa otra rama entera · la misma guarda en dos llamadores · un `as` o
`?? {}` que tapa un tipo.

Y al revés: la abstracción llega con el **segundo** caso real. Con uno, se escribe lo concreto
con nombre y sin ramas que nadie recorre.

## Guardas que el destino ya garantiza

Antes de comprobar algo delante de una llamada, leer qué garantiza la llamada y su test:

1. Si el destino ya lo garantiza y lo prueba, la guarda sobra: se borra.
2. Si no, la guarda va **dentro** del destino, donde protege a todos los llamadores.
3. Una guarda sin test no se borra a ciegas: primero el test del caso, visto en rojo.

## Errores típicos

| Error                                  | Corrección                                 |
| -------------------------------------- | ------------------------------------------ |
| `if (x) return y;` en una línea        | Llaves y líneas en blanco                  |
| `const` a mitad del trabajo            | Al bloque de declaraciones, o bloque nuevo |
| `a ? b : c ? d : e`                    | Función con guardas                        |
| `import { X } from './x'`              | `'./x.js'`                                 |
| `if (!name)` sobre un string           | `name === ''`                              |
| Error declarado junto a quien lo lanza | Archivo propio con el nombre de la clase   |
| `export` de una auxiliar interna       | Quitar `export`                            |
| `${count}`                             | `${String(count)}`                         |
| `eslint-disable` sin motivo escrito    | Arreglar el código, o discutir la regla    |
