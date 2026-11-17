/**
 * The name to use for `wanted` among the names already taken: itself, or the first of
 * `wanted (2)`, `wanted (3)`… that is free. The name goes into `taken`.
 */
export function uniqueName(taken: Set<string>, wanted: string): string {
    let name = wanted;
    let count = 2;

    while (taken.has(name)) {
        name = `${wanted} (${String(count)})`;
        count += 1;
    }

    taken.add(name);

    return name;
}
