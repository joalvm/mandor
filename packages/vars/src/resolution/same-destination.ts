/**
 * Whether two URLs go to the same place: the same scheme, host and port, as the runtime parses
 * them. Comparing the texts by hand misses what the parser folds (case, a trailing dot, a default
 * port, IDN, a backslash) and what it reads where a person does not (`https://good\@evil`). A URL
 * that does not parse, or one whose origin is opaque, matches nothing.
 */
export function sameDestination(base: string, final: string): boolean {
    const from = originOf(base);

    return from !== null && from === originOf(final);
}

function originOf(text: string): string | null {
    const origin = URL.parse(text)?.origin;

    if (origin === undefined || origin === 'null') {
        return null;
    }

    return origin;
}
