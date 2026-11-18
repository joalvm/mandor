/** A description is text, or an object that carries it as `content`. Blank is no description. */
export function descriptionOf(
    description: string | { content?: string | null | undefined } | null | undefined,
): string | undefined {
    const text = typeof description === 'string' ? description : description?.content;

    return text === undefined || text === null || text.trim() === '' ? undefined : text;
}
