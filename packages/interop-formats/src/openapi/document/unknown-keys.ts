/**
 * The keys of a node that no mapping claimed. They ride along into the workspace: the envelope
 * keeps what Mandor does not understand, and dropping them here would drop someone's work.
 */
export function unknownKeys(
    node: Record<string, unknown>,
    known: readonly string[],
): Record<string, unknown> {
    return Object.fromEntries(Object.entries(node).filter(([key]) => !known.includes(key)));
}
