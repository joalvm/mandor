import { CollectionIcon, FileIcon, FolderIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { CollectionNode } from '@mandor/schema';
import { InlineNameInput, RowLabel, TreeRow } from '@mandor/ui';
import { type ReactNode, useState } from 'react';
import { useStore } from 'zustand';
import { fireAndForget, originName, selectConflictFor, useShellStore } from '@mandor/shell';

import { collectionStore } from '../../collection-store.js';
import { useCollectionDrag } from '../../hooks/useCollectionDrag.js';
import { useItemLeaf } from '../../hooks/useItemLeaf.js';
import { ItemProvider } from '../../item-context.js';
import { cancelNaming } from '../../lib/cancel-naming.js';
import { collectionItemMode } from '../../lib/collection-item-mode.js';
import { itemResource } from '../../lib/item-resource.js';
import { renameCollectionNode } from '../../lib/rename-collection-node.js';
import { CollectionFoldFolders } from './CollectionFoldFolders.js';
import { CollectionRowMenu } from './CollectionRowMenu.js';
import { ConflictMark } from './ConflictMark.js';
import { isGroup } from '../../lib/group-nodes.js';

type CollectionRowProps = {
    expanded: boolean | undefined;
    level: number;
    node: CollectionNode;
    workspaceId: string;
};

/** The glyph of each node that holds others. */
const GROUP_GLYPHS = { collection: CollectionIcon, folder: FolderIcon } as const;

/**
 * A collection wears its own mark, a folder is a folder open or closed, the chevron says which;
 * an item wears its kind. A kind with a mark of its own wears it instead, as wide as the mark is
 * and flush with the name, like part of the text.
 */
function RowGlyph({ node, workspaceId }: { node: CollectionNode; workspaceId: string }): ReactNode {
    const leaf = useItemLeaf(isGroup(node) ? undefined : node.itemKind);

    if (isGroup(node)) {
        const Glyph = GROUP_GLYPHS[node.kind];

        return <Glyph size="sm" />;
    }

    if (leaf?.mark !== undefined) {
        const resource = itemResource(originName(), workspaceId, node.path);

        return (
            <span className="flex shrink-0 items-center" data-part="collection-row-mark">
                <ItemProvider value={{ resource, saved: node.mark }}>{leaf.mark}</ItemProvider>
            </span>
        );
    }

    const Glyph = leaf?.component ?? FileIcon;

    return <Glyph size="sm" />;
}

/**
 * One node of the collection, drawn as a line of the tree it sits in. What pressing it does, and
 * which lines are taken, is the tree's; the row is the glyph of the node, its name — or the
 * field that renames it, in the same place — and the menu of what can be done to it.
 *
 * It draws the icon of the kind when this window knows it, and a plain file when it does not,
 * which is the whole of what an unregistered kind costs. While its name is being typed it
 * cannot be dragged: a pointer pressed in the field is choosing letters, not carrying the row.
 */
export function CollectionRow({ expanded, level, node, workspaceId }: CollectionRowProps) {
    const renaming = useStore(collectionStore, (state) => state.renaming === node.path);
    const nodes = useStore(collectionStore, (state) => state.nodes);
    const clashing = useShellStore(
        (state) =>
            selectConflictFor(state, { area: 'collections', path: node.path, workspaceId }) !==
            undefined,
    );
    const [element, setElement] = useState<HTMLDivElement | null>(null);
    const mode = collectionItemMode(nodes, node, expanded === false);
    const drop = useCollectionDrag(renaming ? null : element, { level, mode, node, workspaceId });

    return (
        <div
            data-drop={drop ?? undefined}
            data-level={String(level)}
            data-part="collection-row"
            data-path={node.path}
            ref={setElement}
            role="presentation"
        >
            <TreeRow>
                <RowGlyph node={node} workspaceId={workspaceId} />
                <RowName node={node} renaming={renaming} workspaceId={workspaceId} />
                <ClashMark clashing={clashing} />
                <CollectionFoldFolders node={node} workspaceId={workspaceId} />
                <CollectionRowMenu node={node} workspaceId={workspaceId} />
            </TreeRow>
        </div>
    );
}

function RowName({
    node,
    renaming,
    workspaceId,
}: {
    node: CollectionNode;
    renaming: boolean;
    workspaceId: string;
}) {
    const messages = useMessages('collections');

    function commit(value: string): boolean {
        const name = value.trim();

        if (name.length === 0) {
            return false;
        }

        collectionStore.getState().setRenaming(null);
        fireAndForget(renameCollectionNode(workspaceId, node, name));

        return true;
    }

    if (renaming) {
        return (
            <InlineNameInput
                label={messages('renameField')}
                onCancel={() => {
                    collectionStore.getState().setRenaming(null);
                }}
                onCommit={commit}
                onEscape={() => {
                    fireAndForget(cancelNaming(workspaceId, node));
                }}
                value={node.name}
            />
        );
    }

    return <RowLabel>{node.name}</RowLabel>;
}

function ClashMark({ clashing }: { clashing: boolean }) {
    if (clashing) {
        return <ConflictMark />;
    }

    return null;
}
