/**
 * The name a new workspace takes among the ones the repo already holds: the wanted one if it is
 * free, or the first of `wanted (2)`, `wanted (3)`… that is. An import never writes over a
 * workspace it was not pointed at, and two workspaces with one name cannot be told apart.
 */
export function freeWorkspaceName(taken: readonly string[], wanted: string): string {
    let name = wanted;
    let count = 2;

    while (taken.includes(name)) {
        name = `${wanted} (${String(count)})`;
        count += 1;
    }

    return name;
}
