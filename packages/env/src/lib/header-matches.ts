/**
 * The names that still fit what is being written: the ones that start with it first, then
 * the ones that carry it anywhere, all without care for the case. An empty query fits
 * everything, in the order the names were given.
 */
export function headerMatches(query: string, names: readonly string[]): readonly string[] {
    const needle = query.trim().toLowerCase();
    const fromTheStart: string[] = [];
    const fromAnywhere: string[] = [];

    for (const name of names) {
        const lower = name.toLowerCase();

        if (needle === '' || lower.startsWith(needle)) {
            fromTheStart.push(name);

            continue;
        }

        if (lower.includes(needle)) {
            fromAnywhere.push(name);
        }
    }

    return [...fromTheStart, ...fromAnywhere];
}
