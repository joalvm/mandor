import { DeleteIcon, RenameIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';

import { docsStore } from '../../docs-store.js';

type DocRowMenuProps = { name: string };

/**
 * What a row of the list offers: renaming it in place and deleting it, after one question. A doc
 * is opened by pressing the row.
 */
export function DocRowMenu({ name }: DocRowMenuProps) {
    const messages = useMessages('docs');

    return (
        <span
            data-part="doc-row-menu"
            onClick={(event) => {
                event.stopPropagation();
            }}
            role="presentation"
        >
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
                            docsStore.getState().setRenaming(name);
                        }}
                    >
                        <RenameIcon />
                        {messages('rename')}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            docsStore.getState().setDeleting(name);
                        }}
                    >
                        <DeleteIcon />
                        {messages('delete')}
                    </MenuItem>
                </MenuContent>
            </Menu>
        </span>
    );
}
