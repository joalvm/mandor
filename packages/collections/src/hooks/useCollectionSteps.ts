import { useEffect, type RefObject } from 'react';
import { tinykeys } from 'tinykeys';
import { fireAndForget } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { spotOfStep, type CollectionStep } from '../lib/collection-step.js';
import { focusedPathOf } from '../lib/focused-path.js';
import { nodeAt } from '../lib/node-at.js';
import { placeCollectionNodes } from '../lib/place-collection-nodes.js';

/** The arrows with `Alt` held, so the bare ones keep walking the tree instead of moving it. */
const STEPS: Record<string, CollectionStep> = {
    'Alt+ArrowDown': 'down',
    'Alt+ArrowLeft': 'out',
    'Alt+ArrowRight': 'in',
    'Alt+ArrowUp': 'up',
};

function takeStep(workspaceId: string, event: KeyboardEvent, step: CollectionStep): void {
    const path = focusedPathOf(event.target);
    const { nodes } = collectionStore.getState();
    const node = path === null ? null : nodeAt(nodes, path);

    if (node === null) {
        return;
    }

    const spot = spotOfStep(nodes, node.path, step);

    if (spot === null) {
        return;
    }

    event.preventDefault();
    fireAndForget(placeCollectionNodes(workspaceId, [node], spot));
}

function bindingsOf(workspaceId: string): Record<string, (event: KeyboardEvent) => void> {
    return Object.fromEntries(
        Object.entries(STEPS).map(([combination, step]) => [
            combination,
            (event: KeyboardEvent) => {
                takeStep(workspaceId, event, step);
            },
        ]),
    );
}

/**
 * Moving a node without a pointer. The keys are heard on the tree and nowhere else, so they
 * mean nothing outside it, and what they move is whichever row has the focus. A keypress and a
 * drag are the same journey and end in the same call, which is why neither has its own writer.
 */
export function useCollectionSteps(workspaceId: string, tree: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const element = tree.current;

        if (element === null) {
            return undefined;
        }

        return tinykeys(element, bindingsOf(workspaceId));
    }, [tree, workspaceId]);
}
