import { useEffect, type RefObject } from 'react';
import { tinykeys } from 'tinykeys';

import { collectionStore } from '../collection-store.js';
import { duplicateExampleRow } from '../lib/duplicate-example-row.js';

/**
 * Duplicating without the menu. The key is heard on the tree and nowhere else, and it duplicates
 * the example that is the one thing taken in it. Anywhere else it is left alone, so the browser
 * and the controls inside a row keep what they do with it.
 */
export function useCollectionDuplicateKey(
    workspaceId: string,
    tree: RefObject<HTMLElement | null>,
): void {
    useEffect(() => {
        const element = tree.current;

        if (element === null) {
            return undefined;
        }

        return tinykeys(element, {
            '$mod+d': (event: KeyboardEvent) => {
                const { nodes, selected } = collectionStore.getState();

                if (duplicateExampleRow(workspaceId, nodes, selected)) {
                    event.preventDefault();
                }
            },
        });
    }, [tree, workspaceId]);
}
