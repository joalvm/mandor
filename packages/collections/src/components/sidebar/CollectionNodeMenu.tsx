import { DeleteIcon, FolderIcon, RenameIcon, SettingsIcon, WarningIcon } from '@mandor/icons';
import { useMessages, useTranslator } from '@mandor/i18n';
import type { CollectionNode } from '@mandor/schema';
import { fireAndForget, openConflict, selectConflictFor, useShellStore } from '@mandor/shell';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';
import type { ReactElement } from 'react';

import { CollectionRowProvider } from '../../collection-row-context.js';
import { collectionStore } from '../../collection-store.js';
import { itemLeaves } from '../../item-leaf-registry.js';
import { actedPaths } from '../../lib/acted-paths.js';
import { createCollectionNode } from '../../lib/create-collection-node.js';
import { isGroup } from '../../lib/group-nodes.js';
import { openFolderTab } from '../../lib/open-folder-tab.js';
import { CollectionRowActions } from './CollectionRowActions.js';

type NodeProps = { node: CollectionNode; workspaceId: string };

type CollectionNodeMenuProps = NodeProps & {
    /** The button that opens it. */
    children: ReactElement;
    /**
     * Brings the row of the node into view first. Renaming and deleting happen on the tree, so
     * a menu drawn away from it, on the bar of a tab, shows the row before it asks.
     */
    onReachRow?: () => void;
};

/**
 * The four things a node of the tree does, and a fifth on top while its changes clash: going to
 * the tab that answers them. Making something is offered on folders only, because a leaf holds
 * nothing; which kinds of item there are to make is whatever this window registered, so Sync
 * offers none of them until it draws one. The row of the tree and the bar of a tab open the same
 * menu, each with its own button.
 *
 * Deleting only asks. The question is the tree's, one for every way of asking, so a row that
 * scrolls out of the window while it is open takes nothing with it.
 */
export function CollectionNodeMenu({
    children,
    node,
    onReachRow,
    workspaceId,
}: CollectionNodeMenuProps) {
    const messages = useMessages('collections');
    const conflict = useShellStore((state) =>
        selectConflictFor(state, { area: 'collections', path: node.path, workspaceId }),
    );

    function create(itemKind: string | null, name: string): void {
        collectionStore.getState().fold(workspaceId, node.path, false);
        fireAndForget(createCollectionNode(workspaceId, { itemKind, name, parent: node.path }));
    }

    return (
        <CollectionRowProvider value={{ node, workspaceId }}>
            <Menu>
                <MenuTrigger>{children}</MenuTrigger>
                <MenuContent>
                    <ConflictItem conflict={conflict} />
                    <CreateItems create={create} node={node} />
                    <MenuItem
                        onSelect={() => {
                            onReachRow?.();
                            collectionStore.getState().setRenaming(node.path);
                        }}
                    >
                        <RenameIcon />
                        {messages('rename')}
                    </MenuItem>
                    <SettingsItem node={node} workspaceId={workspaceId} />
                    <CollectionRowActions kind={node.kind} />
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            const { selected, setDeleting } = collectionStore.getState();

                            onReachRow?.();
                            setDeleting(actedPaths(selected, node.path));
                        }}
                    >
                        <DeleteIcon />
                        {messages('delete')}
                    </MenuItem>
                </MenuContent>
            </Menu>
        </CollectionRowProvider>
    );
}

/** The settings of a collection or a folder, in a tab of their own; an item has none. */
function SettingsItem({ node, workspaceId }: NodeProps) {
    const messages = useMessages('collections');

    if (!isGroup(node)) {
        return null;
    }

    return (
        <MenuItem
            onSelect={() => {
                openFolderTab(workspaceId, node.path);
            }}
        >
            <SettingsIcon />
            {messages('settings')}
        </MenuItem>
    );
}

function ConflictItem({ conflict }: { conflict: Parameters<typeof openConflict>[0] | undefined }) {
    const messages = useMessages('collections');

    if (conflict === undefined) {
        return null;
    }

    return (
        <>
            <MenuItem
                onSelect={() => {
                    openConflict(conflict);
                }}
            >
                <WarningIcon />
                {messages('resolveConflict')}
            </MenuItem>
            <MenuSeparator />
        </>
    );
}

function CreateItems({
    create,
    node,
}: {
    create: (itemKind: string | null, name: string) => void;
    node: CollectionNode;
}) {
    const messages = useMessages('collections');
    const translate = useTranslator();

    if (!isGroup(node)) {
        return null;
    }

    return (
        <>
            <MenuItem
                onSelect={() => {
                    create(null, messages('newFolder'));
                }}
            >
                <FolderIcon />
                {messages('newFolder')}
            </MenuItem>
            {itemLeaves().map((leaf) => {
                const Glyph = leaf.component;

                return (
                    <MenuItem
                        key={leaf.id}
                        onSelect={() => {
                            create(leaf.id, translate(leaf.newLabel));
                        }}
                    >
                        <Glyph />
                        {translate(leaf.newLabel)}
                    </MenuItem>
                );
            })}
        </>
    );
}
