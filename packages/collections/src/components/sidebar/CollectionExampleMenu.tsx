import { DeleteIcon, DuplicateIcon, RenameIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { CollectionItemExample, CollectionItemNode } from '@mandor/schema';
import { fireAndForget, isApplePlatform, originName, shortcutLabel } from '@mandor/shell';
import {
    IconButton,
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuShortcut,
    MenuTrigger,
} from '@mandor/ui';

import { CollectionRowProvider } from '../../collection-row-context.js';
import { collectionStore } from '../../collection-store.js';
import { useItemLeaf } from '../../hooks/useItemLeaf.js';
import { actedPaths } from '../../lib/acted-paths.js';
import { exampleResource } from '../../lib/example-resource.js';
import { exampleRowId } from '../../lib/example-row-id.js';
import { CollectionRowActions } from './CollectionRowActions.js';

type CollectionExampleMenuProps = {
    example: CollectionItemExample;
    node: CollectionItemNode;
    workspaceId: string;
};

/**
 * The menu of the line of an example: open it, open it to the side, rename it, duplicate it,
 * whatever lines the app declared for examples, and delete it. Deleting only asks, as in every
 * row of the tree. What the app does with an example is whatever its kind declared; a kind
 * that declared nothing has no menu on its examples.
 */
export function CollectionExampleMenu({ example, node, workspaceId }: CollectionExampleMenuProps) {
    const messages = useMessages('collections');
    const examples = useItemLeaf(node.itemKind)?.examples;
    const rowId = exampleRowId(node.path, example.key);
    const resource = exampleResource(originName(), workspaceId, node.path, example.key);
    const apple = isApplePlatform();

    if (examples === undefined) {
        return null;
    }

    return (
        <span
            data-part="collection-row-menu"
            onClick={(event) => {
                event.stopPropagation();
            }}
            role="presentation"
        >
            <CollectionRowProvider value={{ example, node, workspaceId }}>
                <Menu>
                    <MenuTrigger>
                        <IconButton
                            icon="more-horizontal"
                            label={messages('rowOptions')}
                            size="sm"
                            tabIndex={-1}
                        />
                    </MenuTrigger>
                    <MenuContent>
                        <MenuItem
                            onSelect={() => {
                                examples.open(resource, { beside: false, preview: false });
                            }}
                        >
                            {messages('openExample')}
                        </MenuItem>
                        <MenuItem
                            onSelect={() => {
                                examples.open(resource, { beside: true, preview: false });
                            }}
                        >
                            {messages('openBeside')}
                        </MenuItem>
                        <MenuItem
                            onSelect={() => {
                                collectionStore.getState().setRenaming(rowId);
                            }}
                        >
                            <RenameIcon />
                            {messages('rename')}
                            <MenuShortcut>{shortcutLabel('F2', apple)}</MenuShortcut>
                        </MenuItem>
                        <MenuItem
                            onSelect={() => {
                                fireAndForget(examples.duplicate(resource));
                            }}
                        >
                            <DuplicateIcon />
                            {messages('duplicate')}
                            <MenuShortcut>{shortcutLabel('$mod+D', apple)}</MenuShortcut>
                        </MenuItem>
                        <CollectionRowActions kind="example" />
                        <MenuSeparator />
                        <MenuItem
                            onSelect={() => {
                                const { selected, setDeleting } = collectionStore.getState();

                                setDeleting(actedPaths(selected, rowId));
                            }}
                        >
                            <DeleteIcon />
                            {messages('delete')}
                            <MenuShortcut>{shortcutLabel('Delete', apple)}</MenuShortcut>
                        </MenuItem>
                    </MenuContent>
                </Menu>
            </CollectionRowProvider>
        </span>
    );
}
