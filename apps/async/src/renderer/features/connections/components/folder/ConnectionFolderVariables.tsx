import { FolderVariables } from '@mandor/env';
import { useStore } from 'zustand';

import { connectionsStore } from '../../connections-store.js';

/**
 * The variables of a collection or a folder as Realtime resolves them: an event leaves through
 * the connection in front, so the notes weigh the rows against the environment of that
 * connection, and against the default of the workspace when it names none.
 */
export function ConnectionFolderVariables() {
    const environmentId = useStore(
        connectionsStore,
        (state) =>
            state.connections.find((each) => each.id === state.activeConnectionId)?.environmentId ??
            null,
    );

    return <FolderVariables environmentId={environmentId} />;
}
