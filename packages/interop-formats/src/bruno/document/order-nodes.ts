import type { BrunoNode } from './bruno-tree.js';

/** Where a node with no sequence stands: after every one that has it. */
const NO_SEQUENCE = Number.MAX_SAFE_INTEGER;

/** The sequence a file wrote, as a number; Bruno writes it as text in a `.bru`. */
export function sequenceOf(value: unknown): number {
    const sequence = typeof value === 'string' ? Number(value) : value;

    return typeof sequence === 'number' && Number.isFinite(sequence) ? sequence : NO_SEQUENCE;
}

/** The nodes in the order Bruno shows them: by sequence, then by name. */
export function ordered(nodes: readonly BrunoNode[]): BrunoNode[] {
    return nodes.toSorted(
        (first, second) =>
            first.seq - second.seq ||
            first.name.toLowerCase().localeCompare(second.name.toLowerCase()),
    );
}
