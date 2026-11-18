import type { HistoryEntry } from '@mandor/schema';
import { historySpelling, historyWorkspaceIds } from '@mandor/store-fs';

/**
 * The sends of every other workspace of the origin that name one of these bodies. The store of
 * bodies belongs to the origin, and a body is one file however many workspaces got the same
 * bytes: before one workspace lets a body go, the others say whether they still name it. Only the
 * sends whose file spells one of the refs are parsed, so a full history elsewhere is read, not
 * held.
 */
export async function historyElsewhere(
    root: string,
    workspaceId: string,
    refs: readonly string[],
): Promise<HistoryEntry[]> {
    if (refs.length === 0) {
        return [];
    }

    const others = (await historyWorkspaceIds(root)).filter((id) => id !== workspaceId);
    const found = await Promise.all(others.map((id) => historySpelling(root, id, refs)));

    return found.flat();
}
