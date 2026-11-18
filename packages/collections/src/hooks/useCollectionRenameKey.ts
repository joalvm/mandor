import { useEffect, type RefObject } from 'react';
import { tinykeys } from 'tinykeys';

import { collectionStore } from '../collection-store.js';
import { focusedPathOf } from '../lib/focused-path.js';

/**
 * Renaming without the menu. F2 is heard on the tree and nowhere else, so it means nothing
 * outside it, and it renames whichever row has the focus: the one the reader is standing on.
 */
export function useCollectionRenameKey(tree: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const element = tree.current;

        if (element === null) {
            return undefined;
        }

        return tinykeys(element, {
            F2: (event: KeyboardEvent) => {
                const path = focusedPathOf(event.target);

                if (path !== null) {
                    event.preventDefault();
                    collectionStore.getState().setRenaming(path);
                }
            },
        });
    }, [tree]);
}
