import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Badge, IconButton } from '@mandor/ui';

import { useConnectionsStore } from '../../hooks/useConnectionsStore.js';
import { retryConnectionNow } from '../../lib/retry-connection.js';
import { selectAttemptFor, selectConnectionStateFor } from '../../selectors.js';

import { ConnectionStatusDot } from './ConnectionStatusDot.js';
import { ConnectionTransportMark } from './ConnectionTransportMark.js';

type ConnectionIndicatorProps = {
    connectionId: string;
};

/**
 * What a connection looks like beside its name in a row of the lateral: the logo of the
 * transport it dials with and the live state of its socket, one after the other. A tab splits
 * the pair — the transport opens it, the socket closes it — and takes the two halves apart
 * instead of this one. While a reconnect is under way, a badge names the attempt.
 */
export function ConnectionIndicator({ connectionId }: ConnectionIndicatorProps) {
    const wsState = useConnectionsStore(selectConnectionStateFor(connectionId));
    const attempt = useConnectionsStore(selectAttemptFor(connectionId));
    const reconnecting = wsState === 'reconnecting';

    return (
        <>
            <ConnectionTransportMark connectionId={connectionId} />
            <ConnectionStatusDot connectionId={connectionId} />
            <ReconnectAttempt attempt={attempt} reconnecting={reconnecting} />
            <RetryNow connectionId={connectionId} reconnecting={reconnecting} />
        </>
    );
}

type ReconnectAttemptProps = {
    attempt: number | undefined;
    reconnecting: boolean;
};

function ReconnectAttempt({ attempt, reconnecting }: ReconnectAttemptProps) {
    const messages = useMessages('connections');

    if (!reconnecting || attempt === undefined) {
        return null;
    }

    return (
        <Badge aria-label={messages('reconnectAttempt', { attempt })} count>
            {attempt}
        </Badge>
    );
}

type RetryNowProps = {
    connectionId: string;
    reconnecting: boolean;
};

function RetryNow({ connectionId, reconnecting }: RetryNowProps) {
    const messages = useMessages('connections');

    if (!reconnecting) {
        return null;
    }

    return (
        <IconButton
            icon="refresh"
            label={messages('retryNow')}
            onClick={() => {
                fireAndForget(retryConnectionNow(connectionId));
            }}
            size="sm"
        />
    );
}
