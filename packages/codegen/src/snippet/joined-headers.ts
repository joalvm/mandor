type Header = [string, string];

/**
 * One header per name, whatever its case, its values joined as HTTP joins them. A hashtable or
 * an object literal keeps one key: a header named twice would lose its first value.
 */
export function joinedHeaders(headers: Header[]): Header[] {
    const joined = new Map<string, Header>();

    for (const [name, value] of headers) {
        const held = joined.get(name.toLowerCase());

        joined.set(
            name.toLowerCase(),
            held === undefined ? [name, value] : [held[0], `${held[1]}, ${value}`],
        );
    }

    return [...joined.values()];
}
