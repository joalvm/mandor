/** El ancla de un título: minúsculas, sin acentos, palabras unidas por guiones. */
export function slugOf(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
