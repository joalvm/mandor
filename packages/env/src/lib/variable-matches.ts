/**
 * The declared names the query written so far could still become, in declaration order. An
 * exact match leaves the list empty: there is nothing left to suggest for that name.
 */
export function variableMatches(query: string | null, names: readonly string[]): string[] {
    if (query === null) {
        return [];
    }

    const needle = query.toLowerCase();

    return names.filter((name) => name.toLowerCase().startsWith(needle) && name !== query);
}
