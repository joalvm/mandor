import type { TokenRow } from '../../pieces/token-table.js';

export const SURFACES: readonly TokenRow[] = [
    {
        token: '--surface-frame',
        utility: 'bg-surface-frame',
        note: 'el marco de la ventana: barra de título, lateral, pestañas y barra de estado',
    },
    {
        token: '--surface-card',
        utility: 'bg-surface-card',
        note: 'la tarjeta sobre el marco, donde se dibuja cada pestaña y la consola',
    },
    { token: '--surface-app', utility: 'bg-surface-app', note: 'el lienzo de la aplicación' },
    {
        token: '--surface-panel',
        utility: 'bg-surface-panel',
        note: 'lo que se apoya encima: paneles, barras, listas',
    },
    {
        token: '--surface-sunken',
        utility: 'bg-surface-sunken',
        note: 'lo hundido dentro de un panel: el código, los visores',
    },
    {
        token: '--surface-tray',
        utility: 'bg-surface-tray',
        note: 'la bandeja de lo que depende de otra fila: el velo más tenue sobre su superficie',
    },
    {
        token: '--surface-raised',
        utility: 'bg-surface-raised',
        note: 'lo que se alza sobre el panel',
    },
    { token: '--surface-dialog', utility: 'bg-surface-dialog', note: 'el cuerpo de un diálogo' },
    {
        token: '--surface-dialog-nav',
        utility: 'bg-surface-dialog-nav',
        note: 'el lateral de un diálogo',
    },
    { token: '--surface-dialog-nav-active', utility: 'bg-surface-dialog-nav-active' },
    {
        token: '--surface-control',
        utility: 'bg-surface-control',
        note: 'el control en reposo: cajas, toggles, chips',
    },
    { token: '--surface-control-hover', utility: 'bg-surface-control-hover' },
    { token: '--surface-control-active', utility: 'bg-surface-control-active' },
    {
        token: '--surface-selected',
        utility: 'bg-surface-selected',
        note: 'lo que se está viendo: la selección',
    },
    {
        token: '--surface-veil',
        utility: 'veil',
        note: 'el puntero sobre cualquier cosa: un velo tenue encima de lo que muestra, seleccionado o no',
    },
    {
        token: '--surface-chrome-control',
        utility: 'bg-surface-chrome-control',
        note: 'los controles del cromo de la ventana',
    },
    { token: '--surface-chrome-control-hover', utility: 'bg-surface-chrome-control-hover' },
    { token: '--surface-tab-active', utility: 'bg-surface-tab-active' },
    {
        token: '--surface-overlay',
        utility: 'bg-surface-overlay',
        note: 'la veladura que apaga la página debajo de un diálogo',
    },
    {
        token: '--surface-window-close-hover',
        utility: 'bg-surface-window-close-hover',
        note: 'el botón de cerrar la ventana',
    },
    { token: '--surface-window-close-active', utility: 'bg-surface-window-close-active' },
];

export const TINTS: readonly TokenRow[] = [
    {
        token: '--surface-accent-tint',
        utility: 'bg-surface-accent-tint',
        note: 'el acento en tinte: fondo de Badge y de lo seleccionado nuevo',
    },
    { token: '--surface-success-tint', utility: 'bg-surface-success-tint' },
    { token: '--surface-warning-tint', utility: 'bg-surface-warning-tint' },
    { token: '--surface-error-tint', utility: 'bg-surface-error-tint' },
    { token: '--surface-info-tint', utility: 'bg-surface-info-tint' },
    {
        token: '--surface-selection',
        utility: 'bg-surface-selection',
        note: 'el texto seleccionado, dentro del editor',
    },
    {
        token: '--surface-active-line',
        utility: 'bg-surface-active-line',
        note: 'la línea activa del editor',
    },
];
