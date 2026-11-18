import type { WsState } from '@mandor/ipc';
import { switchOriginTo } from '@mandor/repos';
import { adoptOrigin } from '@mandor/workspace';

import { connectionsStore } from '../features/connections/index.js';
import { asyncBridge } from './async-bridge.js';

/** Where main holds a socket, or a retry waiting to dial one, that the switch has to stop. */
const HELD: ReadonlySet<WsState> = new Set(['open', 'connecting', 'reconnecting']);

/** Switching origin in Mandor Realtime, which is the shared move plus the sockets it holds open. */
export function switchAsyncOriginTo(id: string): Promise<void> {
    return switchOriginTo(id, {
        adopt: adoptOrigin,
        close: closeLiveConnections,
    });
}

/** No socket survives the switch: each one open, opening or about to retry is closed, awaited. */
async function closeLiveConnections(): Promise<void> {
    const { states } = connectionsStore.getState();
    const live = Object.entries(states)
        .filter(([, state]) => HELD.has(state))
        .map(([id]) => id);

    await Promise.all(live.map((id) => asyncBridge.ws.close({ connectionId: id })));
}
