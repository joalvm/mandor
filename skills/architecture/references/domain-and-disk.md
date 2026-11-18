# Domain and disk

El dominio corre en main y en renderer: sin runtime de escritorio, sin DOM, sin `node:fs`.
Todo puro y probado en entorno node.

## Tipos

- Solo datos: sin métodos, clases ni getters.
- JSDoc de una línea con la **invariante** del tipo, no la lista de campos.
- Enums como unión de literales, con la constante de valores al lado:
  `WORKSPACE_KINDS` + `type WorkspaceKind = (typeof WORKSPACE_KINDS)[number]`.
- Variantes como unión discriminada.
- La raíz del formato lleva un `formatVersion` literal: es la marca de migración.

## Identidad

- El id de una entidad es su **ruta relativa** dentro del repositorio de datos. Cada segmento es
  opaco, aleatorio y estable: `newId()` de `@mandor/schema`, 12 caracteres de Crockford en
  minúscula. Lo acuña main o la importación; nunca la ventana.
- El nombre visible vive dentro del archivo: `name`, o `title` en el front matter de un doc.
  Renombrar = reescribir ese campo; el archivo no se mueve y el historial lo sigue. Mover entre
  contenedores sí mueve el archivo, con el mismo id.
- Hermanos con el mismo nombre están permitidos: el id los separa.
- Cada segmento se valida contra un patrón cerrado (`^[a-z0-9][a-z0-9-]*$`). Es también el gate
  de path traversal. Un slug de antes cumple el patrón: los repos viejos se leen sin migrar.
- La interfaz nunca pinta una ruta, un segmento, un id ni un nombre de archivo: solo nombres.

## Fábricas

- Un `createX` por entidad. Objeto como argumento cuando hay opcionales; defaults en el cuerpo.
- Reloj, azar y disco entran inyectados. Una fábrica que lee la hora sola hace parpadear los
  tests.

## Validación

- Un esquema zod por entidad, de abajo arriba, reutilizando piezas (`slugSchema`).
- Integridad referencial en un `superRefine`, no campo a campo.
- `safeParse` + mapeo de issues (`path.join('.')`) + error de dominio con nombre que lleva la
  lista. `.parse()` suelto nunca.
- Lo que sale del parser es la única verdad del formato.
- El JSON Schema público se **genera** desde zod y se versiona. Un test de drift falla si el
  generado no coincide con el versionado.

## Disco

- Un item, un archivo. El orden de una carpeta vive en su propio archivo de metadatos.
- Escritura atómica: temporal en el mismo directorio, luego `rename` encima. `mkdir` recursivo
  antes.
- YAML con una librería que conserva comentarios en el round-trip. Para reescribir: leer con
  `parseDocument`, editar el documento y serializarlo; nunca serializar el objeto plano que salió
  del validador.
- **Claves desconocidas se preservan**: otra app u otra versión puede haber escrito campos que
  esta no entiende.
- Salida estable para diffs limpios: `\n` final, indentación 2, sin envolver líneas largas.
- Un archivo corrupto se descarta y se informa como aviso; no tumba la carga del repositorio.
- Validar al leer **y** al guardar.
- Rutas con `join`. Nada de secretos en archivos versionados.

## Store del renderer

El renderer es **proyección** del disco; la verdad la custodia main. Un store que sabe algo que
el disco no sabe es un bug esperando.

## Variables

- Funciones libres y sin estado, con resultado tipado (`{ text, missing, replaced }`).
- **Una sola pasada de sustitución**: lo sustituido no se reescanea, así que siempre termina.
- Scopes como `ReadonlyMap`; el orden define la precedencia y se documenta. Quien llama arma el
  scope; el paquete de variables no sabe de dónde sale.
