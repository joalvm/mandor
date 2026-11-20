import { useMessages } from '@mandor/i18n';

import type { ConnectionStatus, ConnectionStatusEntry } from '../../activity-entry.js';
import { DockBand } from './DockBand.js';

const LABEL_OF_STATUS: Record<ConnectionStatus, 'stateConnected' | 'stateDisconnected'> = {
    connected: 'stateConnected',
    disconnected: 'stateDisconnected',
};

type ConnectionStatusDetailProps = {
    entry: ConnectionStatusEntry;
};

/**
 * The socket coming up or going down, read in the same dock as any other line. Its moment is the
 * band's to say, as for a frame; the dock says only what happened.
 */
export function ConnectionStatusDetail({ entry }: ConnectionStatusDetailProps) {
    const messages = useMessages('connections');

    return (
        <>
            <DockBand entry={entry} />
            <div
                className="min-h-0 flex-1 overflow-auto px-pad-panel py-pad-control"
                data-format="text"
                data-part="activity-detail"
            >
                <p className="text-sm text-text-secondary">
                    {messages(LABEL_OF_STATUS[entry.detail.status])}
                </p>
            </div>
        </>
    );
}
