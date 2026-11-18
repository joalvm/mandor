import { openFolderTab, useCollectionRow } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { KeyIcon } from '@mandor/icons';
import { useShellStore } from '@mandor/shell';
import { MenuItem } from '@mandor/ui';

/** The line of the menu of a collection or a folder that opens its tab, on the auth. */
export function FolderAuthLine() {
    const messages = useMessages('requests');
    const { node } = useCollectionRow();
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    return (
        <MenuItem
            onSelect={() => {
                if (workspaceId !== null) {
                    openFolderTab(workspaceId, node.path, 'auth');
                }
            }}
        >
            <KeyIcon />
            {messages('folderAuth')}
        </MenuItem>
    );
}
