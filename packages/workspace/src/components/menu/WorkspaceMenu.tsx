import { SettingsIcon, WorkspaceIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { useRepoChanged, useShellStore } from '@mandor/shell';
import { Menu, MenuButton, MenuContent, MenuItem, MenuSeparator } from '@mandor/ui';
import { useStore } from 'zustand';

import { reloadWorkspacesSoon } from '../../reload-workspaces.js';
import { selectWorkspaces } from '../../selectors.js';
import { workspacesStore } from '../../workspaces-store.js';

type WorkspaceMenuProps = {
    /** Administration is a tab, so the feature asks the app to open it instead of opening it. */
    onManage: () => void;
};

/** Names the open workspace and switches between the ones the repository holds. */
export function WorkspaceMenu({ onManage }: WorkspaceMenuProps) {
    const messages = useMessages('workspace');
    const workspaces = useStore(workspacesStore, selectWorkspaces);
    const activeWorkspaceId = useShellStore((state) => state.activeWorkspaceId);
    const setActiveWorkspace = useShellStore((state) => state.setActiveWorkspace);
    const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

    // A workspace appearing, going away or being renamed on disk changes the list.
    useRepoChanged(
        (entity) => entity.area === 'repo' || entity.area === 'workspace',
        reloadWorkspacesSoon,
    );

    return (
        <Menu>
            <MenuButton
                icon="workspace"
                label={active === undefined ? messages('none') : active.name}
                variant="ghost"
            />
            <MenuContent>
                {workspaces.map((workspace) => (
                    <MenuItem
                        key={workspace.id}
                        onSelect={() => {
                            setActiveWorkspace(workspace.id);
                        }}
                    >
                        <WorkspaceIcon />
                        {workspace.name}
                    </MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem onSelect={onManage}>
                    <SettingsIcon />
                    {messages('manage')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}
