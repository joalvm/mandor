/** The fields that have something to say: a field left unset or empty is no key in the document. */
export function withoutEmpty(
    fields: Record<string, string | boolean | undefined>,
): Record<string, string | boolean> {
    return Object.fromEntries(Object.entries(fields).filter(saysSomething));
}

function saysSomething(
    entry: [string, string | boolean | undefined],
): entry is [string, string | boolean] {
    return entry[1] !== undefined && entry[1] !== '';
}
