// Las filas de la API del bloque, dichas una a una.
export const ROW_API = [
    {
        name: 'label',
        type: 'string',
        note: 'El nombre del ajuste. Es la etiqueta del control que va dentro: no se repite al lado.',
    },
    {
        name: 'help',
        type: 'string',
        note: 'Qué significa, en una frase. El control lo lleva como descripción.',
    },
    {
        name: 'inherits',
        type: 'SettingInheritance',
        note: 'De dónde sale el valor mientras la fila no tiene uno propio. Sin él, la fila no hereda de nadie.',
    },
    {
        name: 'stacked',
        type: 'boolean',
        note: 'Para un control más ancho que su columna —una lista, un texto largo—: va bajo el texto, a todo el ancho.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Un control de @mandor/ui, que se cablea al escribirse dentro, como en un Field.',
    },
] as const;

export const INHERITANCE_API = [
    {
        name: 'caption',
        type: 'string',
        note: 'Lo que la línea dice antes del sitio: «Por defecto:».',
    },
    {
        name: 'place',
        type: 'string',
        note: 'El sitio que guarda el valor por defecto, escrito como camino a él: «Ajustes».',
    },
    {
        name: 'onFollow',
        type: '() => void',
        note: 'Abre ese sitio. El dueño sabe dónde está; la fila no.',
    },
    {
        name: 'reset?',
        type: '{ label; onReset }',
        note: 'Presente mientras la fila guarda lo suyo: la línea pasa a ser el gesto que lo devuelve.',
    },
] as const;

export const PIECES_API = [
    {
        name: 'SettingsGroup',
        type: '{ title }',
        note: 'Un grupo con nombre: las filas que responden a la misma pregunta.',
    },
    {
        name: 'SettingRow',
        type: '{ label, help?, inherits?, stacked? }',
        note: 'Una fila: texto a la izquierda, control en su columna a la derecha.',
    },
    {
        name: 'SettingDependents',
        type: '{ children }',
        note: 'Las filas que solo valen con la de arriba encendida, en una bandeja con velo (bg-surface-tray). Las escribe quien tiene el interruptor.',
    },
    {
        name: 'NumberInput',
        type: '{ label, value, onNumber, min?, unit? }',
        note: 'Una cuenta entera en caja corta. Lo que se escribe a medias no sale de la caja.',
    },
] as const;

export const EDITING_API = [
    {
        name: 'SettingsEditing<V>',
        type: '{ values, change, inheritanceOf }',
        note: 'Lo que reciben las filas de un grupo. Los valores por defecto y lo que los sobrescribe dibujan las mismas filas; solo cambia esto.',
    },
    {
        name: 'defaultsEditing',
        type: '(defaults, onDefaults)',
        note: 'Los valores por defecto de la app: lo que guardan es suyo y no hay línea de herencia.',
    },
    {
        name: 'overridesEditing',
        type: '{ defaults, overrides, onOverrides, words }',
        note: 'Un dueño sobre los valores por defecto: guarda solo lo que cambia, y la fila que guarda algo lo devuelve desde su línea.',
    },
    {
        name: 'SettingsInheritanceWords',
        type: '{ caption, place, resetLabel, onFollow }',
        note: 'Lo que dice la línea. En las apps sale de useSettingsInheritance(sección) de @mandor/prefs, que abre los ajustes en esa sección.',
    },
] as const;
