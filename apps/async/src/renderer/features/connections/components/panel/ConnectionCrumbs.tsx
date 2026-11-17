import { useMessages } from '@mandor/i18n';
import type { ConnectionTransport } from '@mandor/schema';
import { Breadcrumbs, IconButton } from '@mandor/ui';

import { TransportLogo } from '../transport/TransportLogo.js';

type ConnectionCrumbsProps = {
    onClose: () => void;
    /** Where the event being composed is filed, outermost first. */
    parts: readonly string[];
    /** What the connection dials: its logo heads the trail, as the protocol heads a request's. */
    transport: ConnectionTransport;
};

/**
 * The band naming the event the connection holds, and the one way to let it go.
 *
 * It heads the half of the event, not the whole panel: the activity beside it belongs to the
 * connection and goes on whatever event is open. Its height is the one of the activity head, so
 * the two halves start on one line.
 */
export function ConnectionCrumbs({ onClose, parts, transport }: ConnectionCrumbsProps) {
    const messages = useMessages('connections');

    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="connection-crumbs"
        >
            <Breadcrumbs label={messages('breadcrumbs')} parts={parts}>
                <TransportLogo transport={transport} />
            </Breadcrumbs>
            <IconButton icon="close" label={messages('closeEvent')} onClick={onClose} />
        </div>
    );
}
