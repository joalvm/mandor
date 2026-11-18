/*
 * Los módulos de Vite que el lab importa: el fuente de una demo como texto (?raw) y las hojas de
 * estilo como efecto secundario. El runtime de Vite expone ambos como export por defecto; la
 * declaración tiene que decir lo mismo que él, no lo que la casa prefiere.
 */

declare module '*?raw' {
    const content: string;

    // eslint-disable-next-line no-restricted-syntax -- el módulo virtual de Vite es un export por defecto, lo declare la casa o no
    export default content;
}

declare module '*.css';
