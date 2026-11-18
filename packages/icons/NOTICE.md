# NOTICE — @mandor/icons

Las geometrías de 68 de las 80 intenciones del registro se toman de
[`@vscode/codicons`](https://github.com/microsoft/vscode-codicons) 0.0.45, obra de Microsoft,
con licencia [CC-BY-4.0](licenses/codicons.txt). La geometría se usa verbatim desde el paquete
fijado; este paquete no redistribuye los SVG del proveedor ni su fuente tipográfica.

Intenciones con fuente propia (no provienen de Codicons):

| Intención          | Origen                  | Motivo                                                                 |
| ------------------ | ----------------------- | ---------------------------------------------------------------------- |
| `braces`           | propia                  | llaves de plantilla; el Codicon equivalente no lleva el mismo gesto    |
| `http`             | propia                  | sello con el texto del protocolo; Codicons no lo ofrece                |
| `import`           | propia                  | bandeja con flecha que entra; el gesto de traer un documento, no bajar |
| `export`           | propia                  | bandeja con flecha que sale; el gesto de llevar un documento, no subir |
| `origin-azure`     | propia                  | marca de proveedor como símbolo contorneado; el Codicon es relleno     |
| `origin-bitbucket` | propia                  | marca de proveedor; Codicons no la ofrece                              |
| `origin-github`    | propia                  | marca de proveedor como símbolo contorneado; el Codicon es relleno     |
| `origin-gitlab`    | propia                  | marca de proveedor; Codicons no la ofrece                              |
| `corner-radius`    | derivada de `square`    | esquina con radio; Codicons no ofrece el radio de esquina              |
| `wrap-text-off`    | derivada de `word-wrap` | variante «apagado»; Codicons no la ofrece                              |

Las derivadas son obras derivadas del arte CC-BY-4.0 del proveedor; las propias son obra
original de Mandor (MIT).

La correspondencia intención por intención, con hash de la fuente usada, vive en
[`icon-sources.json`](../icon-sources.json). El empaquetado de las dos apps distribuye este
aviso con el producto.
