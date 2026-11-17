import { useMessages } from '@mandor/i18n';
import { StatusDot } from '@mandor/ui';

import { useConnectionsStore } from '../../hooks/useConnectionsStore.js';
import { dotStateFor, type DotState } from '../../lib/dot-state.js';
import { selectConnectionStateFor } from '../../selectors.js';

const LABEL_KEYS: Record<DotState, string> = {
    connected: 'stateConnected',
    connecting: 'stateConnecting',
    disconnected: 'stateDisconnected',
    error: 'stateError',
};

type ConnectionStatusDotProps = {
    connectionId: string;
};

/**
 * How the socket of a connection is right now, painted with status tokens and never with the
 * accent. It is the only thing a tab says at its trailing edge, where the close lies waiting:
 * a socket nobody opened reads as down, which is what it is.
 */
export function ConnectionStatusDot({ connectionId }: ConnectionStatusDotProps) {
    const messages = useMessages('connections');
    const wsState = useConnectionsStore(selectConnectionStateFor(connectionId));
    const dotState = dotStateFor(wsState);

    return <StatusDot label={messages(LABEL_KEYS[dotState])} state={dotState} />;
}
