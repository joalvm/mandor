/**
 * The match a step moves the keyboard to from the active one: one forward to the next, one
 * back to the one before, wrapping at both ends of the list.
 */
export function steppedMatch(
    matches: readonly string[],
    active: string | null,
    step: number,
): string | null {
    const at = active === null ? -1 : matches.indexOf(active);

    return matches[(at + step + matches.length) % matches.length] ?? null;
}
