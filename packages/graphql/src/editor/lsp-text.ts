/** The words of a language service answer, which gives them bare or wrapped as markup. */
export function lspTextOf(text: string | { value: string }): string {
    return typeof text === 'string' ? text : text.value;
}
