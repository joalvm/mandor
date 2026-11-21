import { useMessages } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import { Tree } from '@mandor/ui';
import { useRef } from 'react';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { useCollectionDuplicateKey } from '../../hooks/useCollectionDuplicateKey.js';
import { useCollectionRenameKey } from '../../hooks/useCollectionRenameKey.js';
import { useCollectionSteps } from '../../hooks/useCollectionSteps.js';
import { useFollowedLine } from '../../hooks/useFollowedLine.js';
import { useRevealedLine } from '../../hooks/useRevealedLine.js';
import { activateCollectionRow } from '../../lib/activate-collection-row.js';
import { collectionRows, type CollectionRow as Row } from '../../lib/collection-rows.js';
import { expandCollectionRow } from '../../lib/expand-collection-row.js';
import { isGroup } from '../../lib/group-nodes.js';
import { CollectionDeleteDialog } from './CollectionDeleteDialog.js';
import { CollectionExampleRow } from './CollectionExampleRow.js';
import { CollectionRow } from './CollectionRow.js';

/** A workspace nobody folded anything in, shared so the selector keeps answering the same thing. */
const NOTHING_FOLDED: string[] = [];

/** The same for a workspace where nobody closed the examples of any item. */
const NOTHING_CLOSED: string[] = [];

type CollectionTreeProps = { workspaceId: string };

/**
 * The collection of a workspace as a `Tree`: the nodes flattened to lines as far as they are open,
 * and only the ones on screen in the DOM, so a thousand items cost what ten do. What is open and
 * what is taken live in the store, which is how both survive the section being folded away. The
 * line of the tab in front is taken and brought into sight each time another tab comes forward.
 *
 * The keys of the collection's own —F2 to rename, Alt and the arrows to move— are heard around the
 * tree, and the question before deleting stands beside it, never inside a line that scrolls away.
 */
export function CollectionTree({ workspaceId }: CollectionTreeProps) {
    const messages = useMessages('collections');
    const around = useRef<HTMLDivElement>(null);
    const nodes = useStore(collectionStore, (state) => state.nodes);
    const folded = useStore(
        collectionStore,
        (state) => state.folded[workspaceId] ?? NOTHING_FOLDED,
    );
    const closed = useStore(
        collectionStore,
        (state) => state.examplesClosed[workspaceId] ?? NOTHING_CLOSED,
    );
    const selected = useStore(collectionStore, (state) => state.selected);
    const rows = collectionRows(nodes, folded, closed);
    const revealed = useRevealedLine(workspaceId);
    const followed = useFollowedLine(workspaceId);

    useCollectionRenameKey(around);
    useCollectionDuplicateKey(workspaceId, around);
    useCollectionSteps(workspaceId, around);

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-part="collection-tree" ref={around}>
            <Tree
                chevrons
                followed={followed}
                label={messages('heading')}
                lines={rows}
                onActivate={(id, activation) => {
                    activateCollectionRow(workspaceId, rows, id, activation);
                }}
                onDelete={(ids) => {
                    collectionStore.getState().setDeleting(ids);
                }}
                onExpandedChange={(id, expanded) => {
                    expandCollectionRow(workspaceId, rows, id, expanded);
                }}
                onRevealed={() => {
                    shellStore.getState().setRevealing(null);
                }}
                onSelectedChange={(ids) => {
                    collectionStore.getState().setSelected(ids);
                }}
                revealed={revealed}
                selected={selected}
            >
                {rows.map((row) => (
                    <CollectionLine key={row.id} row={row} workspaceId={workspaceId} />
                ))}
            </Tree>
            <CollectionDeleteDialog workspaceId={workspaceId} />
        </div>
    );
}

/** A line of the tree: the row of an example when it is one, and the row of a node when not. */
function CollectionLine({ row, workspaceId }: { row: Row; workspaceId: string }) {
    if (row.example !== undefined && !isGroup(row.node)) {
        return (
            <CollectionExampleRow
                example={row.example}
                level={row.level}
                node={row.node}
                workspaceId={workspaceId}
            />
        );
    }

    return (
        <CollectionRow
            expanded={row.expanded}
            level={row.level}
            node={row.node}
            workspaceId={workspaceId}
        />
    );
}
