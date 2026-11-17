import type { WsState } from '@mandor/ipc';

/** Whether the socket counts as up: the two states a connection can send through. */
export function isLive(state: WsState): boolean {
    return state === 'open' || state === 'connecting';
}
