import { useMessages } from '@mandor/i18n';
import type { Connection } from '@mandor/schema';
import { InlineNameInput, ListRow, RowLabel } from '@mandor/ui';
import {
    fireAndForget,
    originName,
    selectFrontResource,
    shellStore,
    useShellStore,
} from '@mandor/shell';
import { useStore } from 'zustand';

import { connectionsStore } from '../../connections-store.js';
import { connectionResource } from '../../lib/connection-resource.js';
import { openConnection } from '../../lib/open-connection.js';
import { renameConnection } from '../../lib/rename-connection.js';
import type { WorkspaceScope } from '../../lib/workspace-scope.js';
import { ConnectionIndicator } from '../tab/ConnectionIndicator.js';
import { ConnectionRowMenu } from './ConnectionRowMenu.js';

type ConnectionRowProps = {
    connection: Connection;
    scope: WorkspaceScope;
};

/**
 * One entry of the collection: whether the connection is up, its name, and the menu that acts on
 * it. Renaming happens in place: the field stands where the name stood and the rest of the row
 * stays, so the list never moves and the state of the connection stays in sight.
 *
 * The row is marked while the tab in front is the connection, as an explorer follows the editor
 * in front; the focus stays where it was.
 *
 * The row is a `ListRow` and nothing around it. A wrapper would add a node between the
 * list and its options for no one to read, and the row already has the shape a row has.
 */
export function ConnectionRow({ connection, scope }: ConnectionRowProps) {
    const renaming = useStore(connectionsStore, (state) => state.renaming === connection.id);
    const resource = connectionResource(originName(), scope.workspaceId, connection.id);
    const revealed = useShellStore((state) => state.revealing === resource);
    const selected = useShellStore((state) => selectFrontResource(state) === resource);

    function commitRename(value: string): boolean {
        const name = value.trim();

        if (name.length === 0) {
            return false;
        }

        connectionsStore.getState().upsertConnection({ ...connection, name });
        fireAndForget(renameConnection(scope, connection, name));
        connectionsStore.getState().setRenaming(null);

        return true;
    }

    return (
        <ListRow
            level={1}
            onRevealed={() => {
                shellStore.getState().setRevealing(null);
            }}
            onSelect={(activation) => {
                openConnection(connection, scope, { aside: activation.altKey });
            }}
            revealed={revealed}
            selected={selected}
        >
            <ConnectionIndicator connectionId={connection.id} />
            <ConnectionName
                name={connection.name}
                onCancel={() => {
                    connectionsStore.getState().setRenaming(null);
                }}
                onCommit={commitRename}
                renaming={renaming}
            />
            <ConnectionRowMenu
                connection={connection}
                onRename={() => {
                    connectionsStore.getState().setRenaming(connection.id);
                }}
                scope={scope}
            />
        </ListRow>
    );
}

type ConnectionNameProps = {
    name: string;
    onCancel: () => void;
    onCommit: (value: string) => boolean;
    renaming: boolean;
};

function ConnectionName({ name, onCancel, onCommit, renaming }: ConnectionNameProps) {
    const messages = useMessages('connections');

    if (!renaming) {
        return <RowLabel>{name}</RowLabel>;
    }

    return (
        <InlineNameInput
            label={messages('renameField')}
            onCancel={onCancel}
            onCommit={onCommit}
            value={name}
        />
    );
}
