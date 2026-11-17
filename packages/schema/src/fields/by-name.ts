/**
 * The order of what nobody arranges by hand: by the name people see. The id only settles two equal
 * names, so the list stays the same on every read.
 */
export function byName(
    one: { id: string; name: string },
    other: { id: string; name: string },
): number {
    return one.name.localeCompare(other.name) || one.id.localeCompare(other.id);
}
