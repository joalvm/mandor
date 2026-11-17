import { useMessages } from '@mandor/i18n';
import type { CollectionNode } from '@mandor/schema';
import { IconButton } from '@mandor/ui';

import { collectionStore } from '../../collection-store.js';

type CollectionFoldFoldersProps = { node: CollectionNode; workspaceId: string };

/**
 * Closes every folder inside a collection and leaves the collection open, so it reads again from
 * its own first level and the other collections stay as they were. It is a collection's alone: a
 * folder folds with its chevron, and the whole tree from the header of the section. Like the
 * menu beside it, it comes out on the line the pointer or the keyboard is on.
 */
export function CollectionFoldFolders({ node, workspaceId }: CollectionFoldFoldersProps) {
    const messages = useMessages('collections');

    if (node.kind !== 'collection') {
        return null;
    }

    return (
        <span
            data-part="collection-fold-row-menu"
            onClick={(event) => {
                event.stopPropagation();
            }}
            role="presentation"
        >
            <IconButton
                icon="collapse-all"
                iconSize="sm"
                label={messages('foldFolders')}
                onClick={() => {
                    collectionStore.getState().foldInside(workspaceId, node.path);
                }}
                size="sm"
                tabIndex={-1}
            />
        </span>
    );
}
