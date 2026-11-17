<div align="center">

<img src="apps/sync/resources/icon.png" width="88" alt="Mandor Request" />&nbsp;&nbsp;&nbsp;<img src="apps/async/resources/icon.png" width="88" alt="Mandor Realtime" />

# Mandor

**Clientes de API que viven en tu disco.**

Sin cuenta. Sin nube nuestra. Sin telemetría.<br />
Tus requests, sockets y secretos se quedan en tu máquina, en archivos que puedes leer.

[English](README.md) · **Español**

</div>

---

> [!NOTE]
> **Primer release en camino.** Mandor está completo en funciones y en su endurecimiento final;
> lo siguiente son los instaladores firmados para Windows, macOS y Linux. Para enterarte una sola
> vez: **Watch → Custom → Releases**.

## Por qué Mandor

Casi todos los clientes de API empezaron como herramientas y terminaron como plataformas: un
login antes del primer request, tus colecciones en la nube de otro, un plan de pago para lo que
ayer usabas gratis.

Mandor va en la otra dirección.

- **Abres y trabajas.** No hay registro, porque no hay nada en qué registrarse.
- **Tu trabajo son archivos.** YAML y Markdown planos en una carpeta tuya. Los lees, los comparas,
  los respaldas; borras la app y te quedas con todo.
- **Sincronización de equipo sin proveedor.** Apuntas un workspace a un repositorio que ya tienes
  y Mandor lo mantiene al día en segundo plano, con tus credenciales. Sin comandos, sin jerga, sin
  licencias por persona.
- **Dos apps enfocadas en vez de una saturada.** Un request y un socket vivo son trabajos
  distintos. Cada uno tiene un banco de trabajo hecho a su medida.

## Dos apps, una familia

|                                                               |                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <img src="apps/sync/resources/icon.png" width="64" alt="" />  | **Mandor Request** — para todo lo que responde una vez.<br />HTTP y GraphQL, con historial, cookies, OAuth 2.0, ejemplos de respuesta, validación por esquema y snippets de código. Importa OpenAPI, Postman, HAR y curl.      |
| <img src="apps/async/resources/icon.png" width="64" alt="" /> | **Mandor Realtime** — para todo lo que sigue hablando.<br />WebSocket y Socket.IO (v2 a v4, con acknowledgements), con registro de actividad en vivo, reconexión, grabación de sesiones y esquema por mensaje. Habla AsyncAPI. |

Comparten colecciones, entornos, docs y sincronización, y se instalan por separado. Usa una o las
dos.

## Qué trae

**Colecciones que cargan su contexto.** Las carpetas guardan sus propios docs, variables, auth y
headers, y todo lo que cuelga de ellas los hereda.

**Entornos y variables.** `{{variables}}` en cualquier parte, resueltas por entorno. Marcas un
valor como secreto y va al almacenamiento seguro de tu sistema operativo: nunca se escribe en tus
archivos y nunca se sincroniza.

**Sincronización en la que no hay que pensar.** Los cambios de dos personas se unen campo por
campo. Si ambas editaron lo mismo, Mandor muestra las dos versiones lado a lado y tú eliges. Nunca
pisa el historial del otro lado.

**Scripts, en sandbox.** JavaScript antes y después de un request para firmar, encadenar o
comprobar. Corren en un sandbox aislado: sin sistema de archivos, sin módulos, sin acceso a la app. Un
script que llegó de otra persona no corre hasta que lo apruebas en tu máquina.

**Trae tu trabajo contigo.** Importa y exporta workspaces completos de Postman, Insomnia y Bruno,
además de documentos OpenAPI y AsyncAPI.

**Docs junto a las llamadas.** Las páginas Markdown viven en el workspace, al lado de los requests
que explican.

**Una herramienta de escritorio de verdad.** Pestañas, paneles divididos, paleta de comandos y navegación
pensada para el teclado. En español e inglés.

## Tus datos, a la vista

```text
mandor.yaml
workspaces/
  pagos/
    collections/     requests y eventos, un archivo cada uno
    environments/    variables por entorno, sin los secretos
    connections/     sockets (Mandor Realtime)
    docs/            páginas Markdown
```

Sin base de datos, sin binarios opacos, sin candado. Si Mandor desapareciera mañana, tu trabajo
seguiría abriendo en cualquier editor de texto.

## Principios

- **Local primero.** Todo funciona sin conexión, para siempre. Nada que hoy funcione en local
  pasará a exigir un servidor.
- **Sin cuenta.** Ni ahora, ni después como venta adicional.
- **Sin telemetría.** Las apps no llaman a casa. El único tráfico de red es el que tú envías.
- **Los secretos no se mueven.** Un valor que marcas como secreto nunca sale de tu máquina.
- **Nada corre a tus espaldas.** El código que no escribiste no se ejecuta hasta que lo dices.

## Plataformas

Windows (instalador), macOS (dmg) y Linux (AppImage, deb). Las actualizaciones llegan por canales
estable y beta, y tú eliges cuál.

## Contribuir

Los pull requests son bienvenidos. [CONTRIBUTING.md](CONTRIBUTING.md) explica cómo está
organizado el código y qué gates tiene que pasar un cambio; tu primer pull request te pide firmar
el [CLA](CLA.md). Cómo funcionan los scripts y qué permite su sandbox: [SCRIPTS.md](SCRIPTS.md).
Las vulnerabilidades se reportan en privado, como describe [SECURITY.md](SECURITY.md).

## Código abierto

Mandor es software libre bajo la [GNU Affero General Public License v3.0 only](LICENSE).
Copyright (C) 2026 Alejandro Vilchez.

Los issues están abiertos: cuéntanos en qué falla tu cliente actual.

Los nombres y logos son marcas y no están cubiertos por la licencia: ver
[TRADEMARKS.md](TRADEMARKS.md).
