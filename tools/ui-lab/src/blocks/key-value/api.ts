// Las filas de la API del bloque, dichas una a una.
export const TABLE_API = [
    {
        name: 'lines',
        type: 'readonly KeyValueLine[]',
        note: 'La verdad. La orden de las filas es la orden de los pares; editar es por identidad.',
    },
    {
        name: 'onLinesChange',
        type: '(lines: readonly KeyValueLine[]) => void',
        note: 'Cada cambio llega como la lista entera: añadir, editar, quitar y reordenar son el mismo canal.',
    },
    {
        name: 'columns',
        type: '{ value: boolean; description: boolean }',
        note: 'Las columnas visibles, controladas. La clave no se apaga nunca.',
    },
    {
        name: 'onColumnsChange',
        type: '(columns: KeyValueColumns) => void',
        note: 'El menú de la barra pide el cambio; el dueño decide si lo guarda.',
    },
    {
        name: 'environment',
        type: 'Environment | undefined',
        note: 'El entorno contra el que los valores resuelven y sugieren sus variables.',
    },
    {
        name: 'onVariablesChange',
        type: '(variables: readonly Variable[]) => void',
        note: 'El popover de una variable puede declararla; el dueño la escribe donde viva.',
    },
    {
        name: 'title',
        type: 'string',
        note: 'El nombre de la barra: lo que la tabla es tabla de.',
    },
    {
        name: 'typed',
        type: 'boolean',
        note: 'Si las filas llevan tipo. Sin él no hay botón de tipo ni popover.',
    },
    {
        name: 'keySuggestions',
        type: 'readonly string[]',
        note: 'Los nombres que la celda de clave sugiere mientras se escribe. Sin ellos la celda es la línea de siempre.',
    },
    {
        name: 'autoLines',
        type: 'readonly KeyValueAutoLine[]',
        note: 'Las filas que la app añade sola: se leen, no se editan, y el ojo de la barra las trae y las lleva. Ocultas de nacimiento; las hay fijas, calculadas al enviar y pisadas por una fila de la tabla.',
    },
    {
        name: 'onAutoLinesChange',
        type: '(lines: readonly KeyValueAutoLine[]) => void',
        note: 'El dueño oye los interruptores de las filas propias: desmarcadas quedan fuera de lo que sale.',
    },
    {
        name: 'onAutoFollow',
        type: '(id: string) => void',
        note: 'El camino a la parte de la app que gobierna la fila: la pestaña que la dice.',
    },
    {
        name: 'presets',
        type: 'readonly KeyValuePreset[]',
        note: 'El libro de grupos con nombre. Sin él no hay menú de preajustes.',
    },
    {
        name: 'onPresetsChange',
        type: '(presets: readonly KeyValuePreset[]) => void',
        note: 'El gestor pide el libro entero reescrito; el dueño lo guarda donde viva.',
    },
    {
        name: 'secretable',
        type: 'boolean = false',
        note: 'Si las filas pueden llevar valor secreta: puntos hasta que la fila lo destape, marca junto al valor y candado entre las acciones.',
    },
    {
        name: 'variables',
        type: 'boolean = true',
        note: 'Si el valor habla variables: tonos, sugerencias y popover. Falso en la tabla que nace variables, donde el valor es literal.',
    },
    {
        name: 'bulkEdit',
        type: 'boolean = true',
        note: 'Si la barra lleva el texto masivo. Falso cuando la tabla no lo promete.',
    },
    {
        name: 'columnMenu',
        type: 'boolean = true',
        note: 'Si la barra lleva el menú que apaga columnas.',
    },
] as const;

export const LINE_API = [
    {
        name: 'EntryLine',
        type: '{ disabled, id, name, value }',
        note: 'La línea es una entry line con dos columnas más, así que las listas de hoy la adoptan sin tocar su dominio.',
    },
    {
        name: 'description?',
        type: 'string',
        note: 'La tercera columna, cuando el dueño la guarda.',
    },
    {
        name: 'meta?',
        type: 'KeyValueMeta',
        note: 'Tipo, obligatorio, obsoleto, por defecto, enum y cotas.',
    },
    {
        name: 'secret?',
        type: 'boolean',
        note: 'El valor va tapado: puntos en la celda, ojo propio para destaparlo, y al salir del foco vuelve a taparse. Solo una tabla secretable lo ofrece.',
    },
] as const;
