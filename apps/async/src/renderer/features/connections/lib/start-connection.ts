import type { ErrorCode } from '@mandor/ipc';
import { DEFAULT_CONNECTION_TRANSPORT, freeName } from '@mandor/schema';

import { connectionsStore } from '../connections-store.js';

import { openConnection } from './open-connection.js';
import { createConnection } from './create-connection.js';
import type { WorkspaceScope } from './workspace-scope.js';

/** Where a connection starts before anybody points it anywhere. */
const STARTING_URL = 'ws://localhost:3000';

type StartConnectionOptions = {
    /** The word a connection is born with, in the language of the window: «New connection». */
    name: string;
    notify: (code: ErrorCode) => void;
    scope: WorkspaceScope | null;
};

/**
 * The add action of the connections: the connection exists from the first click, under the word
 * it is born with — numbered when another connection wears it — and opens its tab, where the work
 * goes on; its name changes later from the row. Everything else it needs — the url, the
 * transport, the headers — is edited in the tab it opened.
 */
export async function startConnection({
    name,
    notify,
    scope,
}: StartConnectionOptions): Promise<void> {
    if (scope === null) {
        return;
    }

    const result = await createConnection(scope, {
        name: freeName(
            name,
            connectionsStore.getState().connections.map((connection) => connection.name),
        ),
        transport: DEFAULT_CONNECTION_TRANSPORT,
        url: STARTING_URL,
    });

    if (!result.ok) {
        notify(result.error.code);

        return;
    }

    openConnection(result.value, scope);
}
