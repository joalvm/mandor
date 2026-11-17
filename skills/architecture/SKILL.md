---
name: architecture
description: Estándar de estructura de un monorepo TypeScript con varias apps — capas, paquetes por entidad o por rol, apps como raíces de composición, barriles, registros, fronteras, IPC de Electron y dominio en disco. Usar al crear o mover archivos, carpetas o paquetes, al decidir dónde vive código compartido, y al tocar main, preload, IPC, dominio o persistencia.
---

# Architecture

## Capas

Tres capas y las apps encima. Las dependencias van **hacia abajo** o dentro de la misma capa,
sin ciclos; nunca hacia arriba.

| Capa                  | Contiene                                                         | Orden interno                                |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Núcleo puro           | dominio, disco, git, variables, contratos, formatos, transportes | por **entidad**: `repo/`, `workspace/`       |
| Plataforma            | base de la app de escritorio: ventana, preload, handlers comunes | por **área**: `window/`, `menu/`             |
| Superficie compartida | primitivas de UI → cromo → features que montan varias apps       | por **rol**: `components/`, `hooks/`, `lib/` |
| Apps                  | raíces de composición                                            | ver abajo                                    |

Dentro de la superficie hay tres pisos (primitivas, cromo, features). Cada piso importa de los
de abajo; las features no se importan entre sí y el cromo no importa features.

## Paquete

Un paquete es una biblioteca: no sabe qué app lo monta, no arranca nada, no lee configuración
global. Lo variable entra por parámetro o por un registro que la app llena.

```
packages/<name>/
  package.json    exports → ./src/index.ts
  src/
    index.ts      el barril: solo API pública
    <entity>/     núcleo: carpeta = entidad, archivo = operación
  tests/          refleja las carpetas de src/
```

- **Entidad antes que rol** en el núcleo: añadir un campo toca tipo, esquema, parser y fábrica,
  y los cuatro viven en la carpeta de la entidad. Carpetas de rol (`errors/`, `constants/`,
  `schemas/`, `factories/`) reparten lo que cambia junto: prohibidas.
- En la superficie la entidad es el paquete y el eje es el rol; si tiene varias entidades, cada
  una es carpeta y en la raíz quedan store, slices, registros y barril.
- Un paquete de formato se ordena por dirección: `document/` (leer y escribir el formato),
  `import/` (documento → IR), `export/` (IR → documento).
- Sin `utils/` global. Una auxiliar vive junto a su único consumidor.
- Versión exacta de cada dependencia. Toda dependencia interna se declara en `package.json`: el
  bundler y la capa del paquete salen de ahí, y un import sin declarar resuelve igual en local.
- Los paquetes se consumen desde `src/`; los empaqueta el bundler de la app.
- `exports` puede declarar subrutas además del barril (dobles de test, preload, CSS). Desde fuera
  se importa el barril o una subruta declarada; nunca una ruta interna.

### Barriles

Dos clases y ninguna más: el `src/index.ts` de un paquete y el `index.ts` de una feature dentro
de una app. Solo reexportan API pública. Un barril interno apaga el tree-shaking, obliga al
runner a cargar la carpeta entera y deja «ir a definición» parado en el reexport.

Si borrar una línea del barril no rompe nada fuera del paquete, esa línea sobraba.

## App

Una app es la **única** que elige: compone paquetes, decide orden y nombres, y aloja lo que
solo ella hace.

```
apps/<app>/src/
  main/<area>/          handlers que solo tiene esta app
  preload/              puente núcleo + áreas propias
  renderer/app/         raíz: mount, componente raíz y lo que declara en el árbol. Compone
  renderer/features/<f>/ rebanada: index.ts, components/, hooks/, lib/, store
  renderer/<topic>/     compartido por features de esta app, nombrado por tema
```

- Las apps no se importan entre sí. Una feature no importa a otra: hablan por store, por
  registro o por un módulo de la app.
- La app importa la carpeta de la feature (su `index.ts`), por ruta relativa.
- Un módulo de app se nombra por tema, nunca `lib/` o `shared/`, y no importa features.
- La lógica que aparece en el `app/` de dos apps sube a un paquete.

## Compartido o específico

- Lo que sirve a más de una app se escribe **una vez** en un paquete y todas las apps lo
  registran **en el mismo PR**. Escribir para una y adaptar la otra después reabre contratos
  con llamadores, duplica pruebas y acaba en copias que divergen.
- Queda dentro de una app solo con una diferencia de producto documentada. Sin ella, es
  compartido escrito con prisa.
- Cuando algo de una app gana su segundo consumidor, sube en ese mismo PR.
- Un paquete de feature necesita dos apps consumidoras. Excepción: código **puro** (sin
  React, sin runtime de escritorio) puede vivir en un paquete con un consumidor real.
- Un `if` sobre el tipo de app dentro de un paquete compartido es una frontera mal puesta:
  se mueve el código a la app o se abre un registro.

## Registros

Cuando un hueco lo rellena código que el archivo **no puede importar** (el cromo no conoce las
features), la respuesta es un registro, nunca una prop con un componente ni un `if` por app.

Lo que se ve **se declara en el árbol** de la app: cada feature aporta componentes que la app
escribe en su raíz (`<ConnectionTabKind />`, `<CollectionsSection order={20} />`, `<UpdatesStatus />`),
y mientras están montados existen. Así se lee en un archivo qué pinta cada app y en qué orden.

```tsx
<AsyncTabKinds />
<AsyncSidebarSections />
<AsyncPanelActions />
```

- Tabla de módulo donde quien sabe se apunta y quien dibuja pregunta; la apunta el componente
  al montar y la borra al desmontar.
- `mount-*.tsx` solo arranca lo invisible (fallos, comandos, guardado de sesión, borradores):
  nada que pinte se registra desde ahí.
- Una función `register*()` queda solo para lo que no se ve (una superficie, un esquema).
- Se resuelve de lo particular a lo general.
- Con un solo registrante que la capa **sí** puede importar, import directo.

## Clases y recursos

Funciones libres por defecto. Clase solo cuando **posee un recurso** (socket, watcher, búfer,
temporizador): dependencias por constructor, `dispose()` que libera todo, métodos privados al
final.

## Referencias

- Proceso main, preload, IPC, transportes y gates de seguridad →
  [references/desktop-runtime.md](references/desktop-runtime.md)
- Modelo de dominio, validación, identidad y escritura en disco →
  [references/domain-and-disk.md](references/domain-and-disk.md)
