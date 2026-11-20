import type { TokenRow } from '../../pieces/token-table.js';

export const TEXTS: readonly TokenRow[] = [
    { token: '--text-primary', utility: 'text-text-primary', note: 'el texto que se lee primero' },
    {
        token: '--text-secondary',
        utility: 'text-text-secondary',
        note: 'el texto de apoyo: ayudas, cifras, las notas de este lab',
    },
    { token: '--text-disabled', utility: 'text-text-disabled' },
    {
        token: '--text-accent',
        utility: 'text-text-accent',
        note: 'el acento en texto: enlaces y acción',
    },
    {
        token: '--text-variable',
        utility: 'text-text-variable',
        note: 'el token de variable dentro de un campo',
    },
    { token: '--text-success', utility: 'text-text-success' },
    { token: '--text-warning', utility: 'text-text-warning' },
    { token: '--text-error', utility: 'text-text-error' },
    { token: '--text-info', utility: 'text-text-info' },
    {
        token: '--text-iris',
        utility: 'text-text-iris',
        note: 'diferencia por color, reservada a identidades',
    },
    { token: '--text-pink', utility: 'text-text-pink' },
    {
        token: '--text-on-solid-accent',
        utility: 'text-text-on-solid-accent',
        note: 'el texto que cae sobre un sólido',
    },
    { token: '--text-on-solid-status', utility: 'text-text-on-solid-status' },
    { token: '--text-on-solid-danger', utility: 'text-text-on-solid-danger' },
    { token: '--text-on-window-close', utility: 'text-text-on-window-close' },
];

export const BORDERS: readonly TokenRow[] = [
    {
        token: '--border-subtle',
        utility: 'border-border-subtle',
        note: 'la línea de reposo: el borde que casi no se ve',
    },
    {
        token: '--border-chrome',
        utility: 'border-border-chrome',
        note: 'la costura del cromo de la ventana',
    },
    {
        token: '--border-strong',
        utility: 'border-border-strong',
        note: 'el borde del control dibujado en contorno',
    },
    {
        token: '--border-hover',
        utility: 'hover:border-border-hover',
        note: 'el único que no se escribe en reposo',
    },
    {
        token: '--border-error',
        utility: 'border-border-error',
        note: 'el borde del campo inválido',
    },
];

export const SOLIDS: readonly TokenRow[] = [
    { token: '--solid-accent', utility: 'bg-solid-accent', note: 'el botón primario' },
    { token: '--solid-accent-hover', utility: 'hover:bg-solid-accent-hover' },
    { token: '--solid-accent-active', utility: 'active:bg-solid-accent-active' },
    { token: '--solid-success', utility: 'bg-solid-success' },
    { token: '--solid-warning', utility: 'bg-solid-warning' },
    { token: '--solid-error', utility: 'bg-solid-error' },
    { token: '--solid-info', utility: 'bg-solid-info' },
    {
        token: '--solid-danger',
        utility: 'bg-solid-danger',
        note: 'el único rojo de intención: el verbo destructivo confirmado',
    },
    { token: '--solid-danger-hover', utility: 'hover:bg-solid-danger-hover' },
    { token: '--solid-danger-active', utility: 'active:bg-solid-danger-active' },
];

export const FOCUS: readonly TokenRow[] = [
    {
        token: '--focus-ring',
        utility: 'data-focus-frame',
        note: 'el anillo: el borde del control, pintado de acento',
    },
    {
        token: '--focus-ring-width',
        utility: '(runtime.css)',
        note: 'un píxel: nada del control se mueve al recibir el foco',
    },
];
