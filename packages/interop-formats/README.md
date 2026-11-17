# `@mandor/interop-formats`

Los formatos de intercambio de Mandor, cada uno en su carpeta: OpenAPI, AsyncAPI, Postman, Insomnia, Bruno y HAR.
Cada formato lee sus archivos a los recursos de un workspace, y el que sabe escribir también escribe
el workspace de vuelta como documentos. El paquete transforma datos: no guarda archivos
ni decide en qué workspace caen.

## Arquitectura

Un formato publica su `InteropFormat` (`id`, `label`, `reads`, `writes`, `scopes`, `input`, `sniff(files)`, `load()`) y carga su codec
solo cuando un import o un export lo pide. El parser o el SDK, que traen muchas dependencias,
quedan fuera del arranque de quien importa el paquete.

| Formato    | Lee                                         | Escribe                | Parser o SDK                                                            |
| ---------- | ------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `openapi`  | OpenAPI 3.0, 3.1 y Swagger 2.0 (yaml, json) | OpenAPI 3.1 en YAML    | `@readme/openapi-parser`, `@scalar/openapi-upgrader`, `openapi-sampler` |
| `asyncapi` | AsyncAPI 2 y 3 (yaml, json)                 | AsyncAPI 3.0.0 en YAML | `@asyncapi/parser`                                                      |
| `postman`  | colección v2.1, entorno y globals (json)    | colección v2.1 en JSON | `zod`                                                                   |
| `insomnia` | export v4 (json) y v5 (yaml, json)          | colección v5 en YAML   | `yaml`, `zod`                                                           |
| `bruno`    | carpeta OpenCollection (yml) o `.bru`       | carpeta OpenCollection | `yaml`, `zod`, `@usebruno/lang`                                         |
| `har`      | HAR 1.2 (har, json)                         | nada                   | `zod`                                                                   |

Cada carpeta `src/<formato>/` tiene la misma forma:

```
<formato>-format.ts   el InteropFormat, lo único que sale de la carpeta
<formato>-codec.ts    read, documentsOf y textOf de ese formato
document/             leer el texto: sniff-<formato>.ts, parseo, clase de error, id de la fuente
import/               read-files.ts: archivos → recursos del workspace
export/               documents-of.ts: workspace → documentos (solo los formatos que escriben)
```

`src/index.ts` es el único barril: `mandorFormatFor`, `openapiFormat`, `asyncapiFormat`, `postmanFormat`,
`insomniaFormat`, `brunoFormat` y `harFormat`. La clase de error de cada formato (`HarParseError`…) hereda de
`FormatInputError` de `@mandor/interop-core`, y por esa clase la reconoce el host sin nombrar el formato; un archivo
de Mandor escrito por la otra app se rechaza con `ImportOtherAppError`, del mismo contrato. Dentro del paquete cada
módulo importa el archivo que define el símbolo.

Los formatos no se importan entre sí, y una librería de parseo se queda en la carpeta de su formato.
Lo que dos formatos comparten sube a `@mandor/interop-core`.

### OpenAPI

`document/` lee el texto con `yaml`, lo valida con `@readme/openapi-parser`, lo sube a 3.1 con
`@scalar/openapi-upgrader` y sigue los `$ref`. Un `$ref` que se cierra sobre sí mismo queda como está
y se avisa en las notas; uno externo no se sigue, porque un documento es dato y no debe leer archivos
ni red. Lo que la especificación llama error y los documentos reales hacen a diario (un `operationId`
repetido, un parámetro de ruta sin declarar) se lee y se dice en las notas.

`import/` traduce servidores, seguridad, rutas, parámetros, cuerpo y respuestas. Los ejemplos pasan a
texto; si no hay ejemplo, el cuerpo y el valor del parámetro salen del esquema con `openapi-sampler`.
Lo que no tiene sitio en el modelo se conserva en `extras` y se dice en `notes`. `export/` arma el
documento 3.1 del workspace.

### AsyncAPI

`document/` analiza el documento con `@asyncapi/parser`, resuelve `$ref` y recoge los errores; separa
los campos conocidos de los adicionales. `import/` traduce servidores, seguridad, canales,
operaciones, mensajes y esquemas, y produce una conexión por servidor, una carpeta por grupo y un
ítem por operación saliente. `export/` construye un documento `3.0.0`: usa el nombre del modelo como
título, omite las secciones vacías y, si varias operaciones comparten esquema, mueve el mensaje a
`components.messages` y deja referencias. La importación acepta las versiones 2 y 3; la exportación
elige una sola.

### Postman

`sniffPostman` dice qué archivo es por su contenido, no por su extensión (los tres son `.json`) y
rechaza con una sola frase las colecciones v1 y v2.0. `parsePostmanDocument` valida una colección con zod en
`.loose()`, y el esquema y el mapper unifican las formas en que v2.1 deja escribir una misma cosa
(request, url o headers como texto, auth como lista o como objeto, query solo en el texto de la url);
un entorno o unos globals van directos al esquema.

Las carpetas son `groups` (padres antes que hijos, hermanas con el mismo nombre separadas con
` (2)`), cada request es una operación con su canal, y la auth de cada nivel es un esquema con nombre
(`collection`, `folder:<ruta en JSON>`, `request:<nombre>`). El IR guarda todo tal cual lo escribió el
documento: rutas absolutas, nombres de variable que Mandor no acepta y secretos. Qué admite Mandor se
decide después, al pasar a recursos.

Al escribir, `export/` arma una colección v2.1 por colección del workspace, con las variables y la
auth del workspace dentro de cada una: Postman no tiene archivo de workspace. Las carpetas salen
una por carpeta de primer nivel.

### Insomnia

`sniffInsomnia` reconoce por contenido el export v4 (JSON con `_type: export` y la lista plana de
`resources`) y el v5 (YAML o JSON con `type: collection.insomnia.rest/5.0`); un v5 que no sea una
colección (spec, mock, entorno) se rechaza con motivo. `document/` lee las dos formas al mismo árbol
neutro (`insomnia-tree.ts`): el v4 reconstruye el árbol desde los `parentId`, ordenado por
`metaSortKey`; el v5 ya viene anidado. Una tabla por versión elige el lector, así una versión nueva
es una fila.

`import/` pasa el árbol a recursos sin IR intermedio: carpetas, requests, entornos y un recurso de
workspace con el entorno base. Las referencias `{{ _.x }}` pasan a `{{x}}`; la auth, el cuerpo y los
parámetros de ruta tienen su traductor. Insomnia no marca secretos: los valores de las variables
entran tal como vienen. Una credencial escrita en una auth no se importa y se avisa en
`degradations`; va a una variable secreta de un entorno. Lo que Insomnia guarda y Mandor no tiene
(scripts, ajustes de la request, otros protocolos) se dice igual.

`export/` escribe un archivo v5 por colección, con ids deterministas (prefijo y hash de la ruta) para
que exportar dos veces dé el mismo texto.

### Bruno

Bruno es el único formato que se lee de una carpeta (`input: 'folder'`): los archivos llegan con su
ruta bajo la carpeta elegida. `sniff-bruno.ts` busca raíces de colección a cualquier profundidad (una
carpeta puede traer varias): `opencollection.yml` con `opencollection:` es OpenCollection y
`bruno.json` es `.bru`. Una tabla de lectores elige uno, y los dos dejan el mismo árbol neutro
(`bruno-tree.ts`); `read-bru.ts` es lo único que importa `@usebruno/lang`, y `opencollection-schema.ts`
se comprueba contra `@opencollection/types` en un `.test-d.ts`.

`import/` pasa el árbol a recursos: una colección por raíz con sus carpetas, requests y entornos, y un
recurso de workspace con la auth y las variables de la primera colección (las de las demás se avisan
en `degradations`). Lo que Bruno guarda y Mandor no tiene (scripts, tests, aserciones, variables de
request, ajustes, etiquetas, cabeceras de carpeta) se dice igual. Un secreto escrito en una auth no se
importa. Los flujos OAuth2 `password` e `implicit` no tienen equivalente.

`export/` escribe OpenCollection: `opencollection.yml`, un `folder.yml` por carpeta, un archivo por
request y `environments/`. Los nombres son seguros como nombres de archivo y únicos sin distinguir
mayúsculas; con varias colecciones, cada una va en un directorio con su nombre. Las variables y la
auth del workspace viajan en el `request` de cada colección. No escribe `.bru`.

### HAR

`parseHarDocument` valida el archivo con zod y `request-body-of` / `har-body` pasan el cuerpo de cada
entrada a texto según su tipo. Cada entrada es una operación; lo que el IR no puede llevar queda en
`extras` y se avisa.

## Uso

```ts
import { asyncapiFormat } from '@mandor/interop-formats';

async function preview(textoAsyncapi: string) {
    const files = [{ path: 'api.yaml', text: textoAsyncapi }];

    if (!asyncapiFormat.sniff(files)) {
        return null;
    }

    const codec = await asyncapiFormat.load();
    const { name, resources } = await codec.read(files, 'collection');

    return { name, resources };
}
```

`sniff(files)` reconoce los archivos por su forma, sin cargar el codec. `read(files, scope)` devuelve el
nombre que el documento se dio y los recursos que el workspace guardaría —conexiones, carpetas e
ítems que el consumidor compara y aplica; el codec no los escribe—, o lanza el error de su formato con
la lista de problemas. `documentsOf(data)` devuelve los documentos de un workspace como datos, que el
consumidor redacta antes de pedir el texto con `textOf(document)`. Un formato que no escribe declara
`writes: []` y no tiene `export/`.

## Cambiar una conversión

Un campo nuevo del documento tiene su `map-*` en `import/` y, si el formato escribe, su pareja en
`export/`. Si el modelo no lo conoce, va a `extras` con una nota; no se descarta en silencio. Fixtures
y casos concretos viven en `tests/<formato>/`, con la misma forma que `src/<formato>/`.
