import { ConnectIcon, DisconnectIcon } from '@mandor/icons';
import { useLanguage, useMessages } from '@mandor/i18n';
import type { ReactNode } from 'react';

import type { ConnectionStatus, ConnectionStatusEntry } from '../../activity-entry.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';

type StatusLook = {
    glyph: ReactNode;
    label: 'stateConnected' | 'stateDisconnected';
    /** The glyph alone carries the colour: the line reads as chrome between the frames. */
    tone: string;
};

const STATUS_LOOKS: Record<ConnectionStatus, StatusLook> = {
    connected: {
        glyph: <ConnectIcon size="sm" />,
        label: 'stateConnected',
        tone: 'flex w-6 shrink-0 items-center justify-center text-text-success',
    },
    disconnected: {
        glyph: <DisconnectIcon size="sm" />,
        label: 'stateDisconnected',
        tone: 'flex w-6 shrink-0 items-center justify-center text-text-secondary',
    },
};

type ConnectionStatusRowProps = {
    entry: ConnectionStatusEntry;
};

/**
 * The socket coming up or going down, as one more line of the timeline: it happened at a moment
 * and sits there among the frames, so what the connection moved reads between its two ends.
 */
export function ConnectionStatusRow({ entry }: ConnectionStatusRowProps) {
    const messages = useMessages('connections');
    const language = useLanguage();
    const look = STATUS_LOOKS[entry.detail.status];

    return (
        <div
            className="flex h-row min-w-0 flex-1 items-center gap-gap-group px-pad-control text-xs tabular-nums text-text-secondary"
            data-part="activity-status-row"
            data-status={entry.detail.status}
        >
            <span aria-hidden="true" className={look.tone}>
                {look.glyph}
            </span>
            <span className="min-w-0 flex-1 truncate" data-part="activity-status-message">
                {messages(look.label)}
            </span>
            <time className="w-16 shrink-0" dateTime={new Date(entry.at).toISOString()}>
                {formatActivityTime(entry.at, language)}
            </time>
            {/* The column of the bytes, empty: the moment stays under the moments of the frames. */}
            <span aria-hidden="true" className="w-13 shrink-0" />
        </div>
    );
}
