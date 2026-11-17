import { DeleteIcon, RenameIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { IconButton, Menu, MenuContent, MenuItem, MenuTrigger } from '@mandor/ui';

type WorkspaceRowMenuProps = {
    onRename: () => void;
    onDelete: () => void;
};

/** What one row of the table offers: renaming in place, and the way out. */
export function WorkspaceRowMenu({ onRename, onDelete }: WorkspaceRowMenuProps) {
    const messages = useMessages('workspace');

    return (
        <Menu>
            <MenuTrigger>
                <IconButton icon="more-horizontal" label={messages('rowOptions')} size="sm" />
            </MenuTrigger>
            <MenuContent>
                <MenuItem onSelect={onRename}>
                    <RenameIcon />
                    {messages('rename')}
                </MenuItem>
                <MenuItem onSelect={onDelete}>
                    <DeleteIcon />
                    {messages('deleteAction')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}
