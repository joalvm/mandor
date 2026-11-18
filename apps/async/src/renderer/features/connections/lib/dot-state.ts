import type { WsState } from '@mandor/ipc';

/** The four faces a StatusDot has, out of the six lives a socket goes through. */
export type DotState = 'connected' | 'connecting' | 'disconnected' | 'error';

const DOT_STATE_BY_WS_STATE: Record<WsState, DotState> = {
    idle: 'disconnected',
    connecting: 'connecting',
    open: 'connected',
    closing: 'disconnected',
    closed: 'disconnected',
    error: 'error',
    reconnecting: 'connecting',
};

export function dotStateFor(state: WsState): DotState {
    return DOT_STATE_BY_WS_STATE[state];
}
