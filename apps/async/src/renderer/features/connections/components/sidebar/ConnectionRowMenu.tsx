import { ConnectIcon, DeleteIcon, DisconnectIcon, RenameIcon, SettingsIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Connection } from '@mandor/schema';
import {
    ConfirmDialog,
    IconButton,
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuTrigger,
    useToast,
} from '@mandor/ui';
import { useState } from 'react';
import { useStore } from 'zustand';
import { fireAndForget } from '@mandor/shell';

import { connectionsStore } from '../../connections-store.js';
import { deleteConnection } from '../../lib/delete-connection.js';
import { isLive } from '../../lib/live-state.js';
import { selectConnectionStateFor } from '../../selectors.js';
import { requestConnectionToggle } from '../../lib/toggle-connection.js';
import type { WorkspaceScope } from '../../lib/workspace-scope.js';
import { ConnectionSettingsDialog } from '../dialog/ConnectionSettingsDialog.js';

type ConnectionRowMenuProps = {
    connection: Connection;
    onRename: () => void;
    scope: WorkspaceScope;
};

/**
 * What a row of the collection does to the connection it names: turn it, configure it, rename it,
 * and — asked first — delete it. The switch speaks the state of the socket: a connection that
 * is up offers the way down, and one that is down offers the way up. Deleting cannot be taken
 * back, so the confirmation lives here with the command that opens it and never travels up to
 * the row, which has a name to draw and nothing to ask.
 */
export function ConnectionRowMenu({ connection, onRename, scope }: ConnectionRowMenuProps) {
    const messages = useMessages('connections');
    const toast = useToast();
    const [confirming, setConfirming] = useState(false);
    const [settings, setSettings] = useState(false);
    const wsState = useStore(connectionsStore, selectConnectionStateFor(connection.id));
    const live = isLive(wsState);
    const Glyph = live ? DisconnectIcon : ConnectIcon;

    return (
        <span
            data-part="connection-row-menu"
            onClick={(event) => {
                event.stopPropagation();
            }}
            role="presentation"
        >
            <Menu>
                <MenuTrigger>
                    <IconButton icon="more-horizontal" label={messages('rowOptions')} size="sm" />
                </MenuTrigger>
                <MenuContent>
                    <MenuItem onSelect={onRename}>
                        <RenameIcon />
                        {messages('rename')}
                    </MenuItem>
                    <MenuItem
                        onSelect={() => {
                            setSettings(true);
                        }}
                    >
                        <SettingsIcon />
                        {messages('settings')}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            requestConnectionToggle({
                                connection,
                                live,
                                notify: toast.notify,
                                scope,
                                translate: messages,
                            });
                        }}
                    >
                        <Glyph />
                        {messages(live ? 'disconnect' : 'connect')}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                        onSelect={() => {
                            setConfirming(true);
                        }}
                    >
                        <DeleteIcon />
                        {messages('delete')}
                    </MenuItem>
                </MenuContent>
            </Menu>
            <ConnectionSettingsDialog
                closeLabel={messages('close')}
                connection={connection}
                onOpenChange={setSettings}
                open={settings}
                scope={scope}
            />
            {/* modal-policy: irreversible-confirmation */}
            <ConfirmDialog
                cancelLabel={messages('deleteCancel')}
                confirmLabel={messages('deleteConfirm')}
                description={messages('deleteBody', { name: connection.name })}
                onCancel={() => {
                    setConfirming(false);
                }}
                onConfirm={() => {
                    setConfirming(false);
                    fireAndForget(deleteConnection(scope, connection.id));
                }}
                onOpenChange={setConfirming}
                open={confirming}
                title={messages('deleteTitle')}
            />
        </span>
    );
}
