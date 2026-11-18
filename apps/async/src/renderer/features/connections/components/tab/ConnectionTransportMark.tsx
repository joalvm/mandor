import { useConnectionsStore } from '../../hooks/useConnectionsStore.js';
import { selectTransportFor } from '../../selectors.js';
import { TransportLogo } from '../transport/TransportLogo.js';

type ConnectionTransportMarkProps = {
    connectionId: string;
};

/**
 * What a connection dials with, drawn where a tab puts the icon of the thing it holds: the logo
 * of the transport and nothing else. A connection nobody holds names no transport, and an empty
 * mark is the honest answer — a placeholder logo would be a guess.
 */
export function ConnectionTransportMark({ connectionId }: ConnectionTransportMarkProps) {
    const transport = useConnectionsStore(selectTransportFor(connectionId));

    if (transport === undefined) {
        return null;
    }

    return <TransportLogo transport={transport} />;
}
