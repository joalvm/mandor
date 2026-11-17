import { leavesOf, type GridLeaf, type GridNode } from '@mandor/ipc';

/** The tabs of each group by when they were last in front, the latest first, by group id. */
export type Recency = Readonly<Record<string, readonly string[]>>;

function orderOf(known: readonly string[], leaf: GridLeaf): readonly string[] {
    const open = leaf.tabs.map((tab) => tab.id);
    const used = known.filter((id) => open.includes(id) && id !== leaf.activeTab);
    const front = leaf.activeTab === null ? [] : [leaf.activeTab];
    const unused = open.filter((id) => id !== leaf.activeTab && !used.includes(id));

    // A tab never put in front yet goes after every one that was, in the order of the strip.
    return [...front, ...used, ...unused];
}

/**
 * The order of use after a change of the tree: the tab each group shows goes first, what left
 * the group drops out, and a group that is gone takes its order with it.
 */
export function recencyOf(before: Recency, grid: GridNode): Recency {
    return Object.fromEntries(
        leavesOf(grid).map((leaf) => [leaf.id, orderOf(before[leaf.id] ?? [], leaf)]),
    );
}

/**
 * The tab `step` places down the order of use, going round: one step is the tab used before
 * the one in front, and a step back from the front is the one used longest ago.
 */
export function recentTabAt(order: readonly string[], step: number): string | undefined {
    if (order.length === 0) {
        return undefined;
    }

    return order[((step % order.length) + order.length) % order.length];
}
