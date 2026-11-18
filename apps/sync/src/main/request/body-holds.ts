import { inTurn, removeBodies } from '@mandor/store-fs';

/** The bodies one send keeps from removal, from the moment it writes them until it lets them go. */
export type BodyHold = {
    keep: (ref: string) => void;
    /** Once its entry names them, or there will be none: the send is over either way. */
    release: () => void;
};

/** How many sends in flight hold each body, by the root of the origin whose store it is in. */
const HELD = new Map<string, Map<string, number>>();

function countsOf(root: string): Map<string, number> {
    const known = HELD.get(root);

    if (known !== undefined) {
        return known;
    }

    const counts = new Map<string, number>();

    HELD.set(root, counts);

    return counts;
}

function letGo(root: string, ref: string): void {
    const counts = countsOf(root);
    const left = (counts.get(ref) ?? 1) - 1;

    if (left > 0) {
        counts.set(ref, left);

        return;
    }

    counts.delete(ref);

    if (counts.size === 0) {
        HELD.delete(root);
    }
}

/**
 * The hold of one send. A send spills its bodies before it writes the entry that names them; in
 * between, the bodies are named by nobody, and an old entry of the same bytes that goes would take
 * them along.
 */
export function bodyHold(root: string): BodyHold {
    const kept: string[] = [];

    return {
        keep: (ref) => {
            const counts = countsOf(root);

            counts.set(ref, (counts.get(ref) ?? 0) + 1);
            kept.push(ref);
        },
        release: () => {
            for (const ref of kept.splice(0)) {
                letGo(root, ref);
            }
        },
    };
}

/** Deletes the stored bodies no entry names any more, except those a send in flight holds. */
export async function removeUnheldBodies(root: string, refs: readonly string[]): Promise<void> {
    await inTurn(root, async () => {
        const held = HELD.get(root);

        await removeBodies(
            root,
            refs.filter((ref) => held?.has(ref) !== true),
        );
    });
}
