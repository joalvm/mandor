# `@mandor/exchange`

Lleva documentos de otros formatos al workspace. Hoy reúne el diálogo de **importar**: el usuario elige o suelta un archivo, ve el plan como árbol (qué se añade, qué se actualiza, qué choca) y aplica lo que deja marcado. El paquete no conoce el formato ni dónde aterriza lo importado: cada app lo registra con su identificador de formato, sus textos y lo que hace al terminar.

## Uso

```tsx
<ImportDialogAction
    format="asyncapi"
    hint="AsyncAPI 2.x o 3.x, en JSON o YAML"
    note="Cada mensaje queda como evento sin destino"
    onImported={(workspaceId) => void loadCollection(workspaceId)}
/>
```

- `format`: id del formato; viaja a `bridge.import.plan` y `apply`.
- `hint` y `note`: lo que dice la zona de soltar y el pie del diálogo.
- `onImported`: lo que la app recarga tras escribir (las colecciones propias).
- `onImported` del barril es la señal que otras partes de la ventana escuchan cuando un import termina.

## Estructura

```
src/import/
  components/dialog/   diálogo, zona de soltar, árbol, notas, pie
  hooks/useImportFlow  pick → plan → apply, con el estado de la selección
  lib/                 árbol del plan, lectura de archivo soltado, señal de import
```

Las notas del documento (lo que el plan no puede mostrar como fila) salen encima del árbol; sin notas no se pinta nada.
