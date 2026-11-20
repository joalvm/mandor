import type { TokenRow } from '../../pieces/token-table.js';

export const HEIGHTS: readonly TokenRow[] = [
    {
        token: '--mandor-height-control-xs',
        utility: 'h-control-xs',
        note: 'el control más chico: dentro de una fila apretada',
    },
    {
        token: '--mandor-height-control-sm',
        utility: 'h-control-sm',
        note: 'el compacto, alineado con la fila y la barra de estado',
    },
    {
        token: '--mandor-height-tab',
        utility: 'h-tab',
        note: 'la pestaña de una tira dentro de una tarjeta',
    },
    {
        token: '--mandor-height-row-xs',
        utility: 'h-row-xs',
        note: 'la fila de árbol comprimida',
    },
    {
        token: '--mandor-height-row',
        utility: 'h-row',
        note: 'la fila de lista y de tabla',
    },
    {
        token: '--mandor-height-statusbar',
        utility: 'h-statusbar',
        note: 'la barra de estado',
    },
    {
        token: '--mandor-height-field',
        utility: 'h-field',
        note: 'la caja de campo',
    },
    {
        token: '--mandor-height-control',
        utility: 'h-control',
        note: 'el control normal: botón, switch, select, línea de menú',
    },
    {
        token: '--mandor-height-grid-tab',
        utility: 'h-grid-tab',
        note: 'la pestaña de trabajo, en la tira del marco',
    },
    {
        token: '--mandor-height-crumb',
        utility: 'h-crumb',
        note: 'la banda de migas de una tarjeta',
    },
    {
        token: '--mandor-height-control-dialog',
        note: 'el control dentro de un diálogo: el diálogo reescribe h-control con este valor',
    },
    {
        token: '--mandor-height-section',
        utility: 'h-section',
        note: 'la cabecera de sección',
    },
    {
        token: '--mandor-height-address',
        utility: 'h-address',
        note: 'la barra de dirección de una petición o una conexión',
    },
    {
        token: '--mandor-height-strip',
        utility: 'h-strip',
        note: 'la tira de pestañas de trabajo, en el marco',
    },
    {
        token: '--mandor-height-header',
        utility: 'h-header',
        note: 'la cabecera de una vista',
    },
    {
        token: '--mandor-height-titlebar',
        utility: 'h-titlebar',
        note: 'la barra de título de la ventana',
    },
    {
        token: '--mandor-height-row-pair',
        utility: 'h-row-pair',
        note: 'la fila de dos líneas: un nombre y lo que dice de él',
    },
    {
        token: '--mandor-height-toolbar',
        utility: 'h-toolbar',
        note: 'la barra de herramientas alta',
    },
];

export const WIDTHS: readonly TokenRow[] = [
    {
        token: '--mandor-width-handle',
        note: 'el asa entre dos mitades: la línea que se arrastra',
    },
    {
        token: '--mandor-width-toggle',
        utility: 'w-toggle',
        note: 'la pastilla del switch',
    },
    {
        token: '--mandor-width-tab-min',
        note: 'lo menos que mide una pestaña de trabajo antes de desplazar la tira',
    },
    {
        token: '--mandor-width-tab',
        note: 'lo más que mide una pestaña de trabajo',
    },
    {
        token: '--mandor-width-setting-control',
        note: 'la columna del control en una fila de ajuste',
    },
    {
        token: '--mandor-width-form-label',
        note: 'la columna de la etiqueta en un formulario',
    },
    {
        token: '--mandor-width-settings-nav',
        utility: 'w-settings-nav',
        note: 'el lateral de preferencias',
    },
    {
        token: '--mandor-width-sidebar',
        utility: 'w-sidebar',
        note: 'el lateral de navegación',
    },
    {
        token: '--mandor-width-tooltip',
        note: 'el ancho máximo del tooltip; lo pone el tooltip',
    },
    {
        token: '--mandor-width-toast',
        utility: 'w-toast',
        note: 'el aviso',
    },
    {
        token: '--mandor-width-dialog-confirm',
        note: 'el diálogo de confirmación; lo pone el diálogo',
    },
    {
        token: '--mandor-width-command-center',
        utility: 'w-command-center',
        note: 'el centro de comandos de la barra de título',
    },
    {
        token: '--mandor-width-dialog-form',
        note: 'el diálogo con formulario; lo pone el diálogo',
    },
    {
        token: '--mandor-width-form',
        utility: 'w-form',
        note: 'la columna de un formulario de página',
    },
    {
        token: '--mandor-width-dialog-sections',
        note: 'el diálogo de secciones; lo pone el diálogo',
    },
    {
        token: '--mandor-width-dialog-code',
        note: 'el diálogo que muestra código; la ventana lo recorta',
    },
];
