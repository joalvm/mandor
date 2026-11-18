import type { Connection, RequestLine } from '@mandor/schema';
import { settlePendingWrites } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionDefaultsStore } from '../connection-defaults-store.js';
import { connectionsStore } from '../connections-store.js';

import { openOptionsOf } from './open-options.js';
import type { WorkspaceScope } from './workspace-scope.js';

/** The params travel as the wire needs them: what they say, and whether they are on. */
function paramsOf(
    lines: readonly RequestLine[],
): { enabled: boolean; key: string; value: string }[] {
    return lines.map((line) => ({ enabled: line.enabled, key: line.key, value: line.value }));
}

/**
 * The headers travel as the handshake sends them: the ones switched on, by name. A name written
 * twice is one header, and the later line is the one it says.
 */
function headersOf(lines: readonly RequestLine[]): Record<string, string> {
    return Object.fromEntries(
        lines
            .filter((line) => line.enabled && line.key !== '')
            .map((line) => [line.key, line.value]),
    );
}

/** How one open goes: `skipScripts` dials past the scripts, for the way out of a broken one. */
export type OpenSocketWay = { skipScripts?: boolean };

/**
 * Asks main to open the socket and says whether it came up. The visible state arrives as a push,
 * never invented; a refusal lands on the connection as a code, and a new attempt clears the
 * previous one. Whoever was going to send through it reads the answer and stops. Main reads the
 * variables from disk: what was typed a moment ago has to reach it first. The scripts travel with
 * the open, as they are now: main runs `onBeforeConnect` before it dials, unless the open says to
 * skip them.
 */
export async function openSocket(
    connection: Connection,
    scope: WorkspaceScope,
    way: OpenSocketWay = {},
): Promise<boolean> {
    connectionsStore.getState().setConnectionError(connection.id, null);
    await settlePendingWrites();

    const opened = await asyncBridge.ws.open({
        connectionId: connection.id,
        ...scope,
        environmentId: connection.environmentId,
        transport: connection.transport,
        template: {
            headers: headersOf(connection.headers),
            url: connection.url,
            ...(connection.params === undefined ? {} : { params: paramsOf(connection.params) }),
            ...(connection.auth === undefined ? {} : { auth: connection.auth }),
        },
        ...(connection.socketio === undefined ? {} : { socketio: connection.socketio }),
        ...(connection.scripts === undefined ? {} : { scripts: connection.scripts }),
        ...(way.skipScripts === true ? { skipScripts: true } : {}),
        ...openOptionsOf(connection, connectionDefaultsStore.getState().defaults),
    });

    // A cancel is the person's own: they closed it or opened it again, and nothing failed.
    if (!opened.ok && opened.error.code !== 'ws-open-cancelled') {
        connectionsStore.getState().setConnectionError(connection.id, opened.error.code);
    }

    return opened.ok;
}
