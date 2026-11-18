import { WarningIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';

import type { ConnectionMessageEntry } from '../../activity-entry.js';
import { formatByteSize } from '../../lib/format-byte-size.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';

type UnansweredAckRowProps = {
    entry: ConnectionMessageEntry;
};

/**
 * The close of an unanswered wait, wearing the fault the timeline already has: same shape, same
 * red, one line like any other row.
 */
export function UnansweredAckRow({ entry }: UnansweredAckRowProps) {
    const messages = useMessages('connections');
    const record = entry.detail;

    return (
        <div
            className="flex h-row min-w-0 flex-1 items-center gap-gap-group pl-9 pr-pad-control text-xs tabular-nums"
            data-part="activity-row"
            data-reply="fault"
        >
            <span className="flex w-6 shrink-0 items-center justify-center text-text-danger">
                <WarningIcon size="sm" />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold" data-part="activity-event">
                {record.event === undefined
                    ? messages('ackUnanswered')
                    : `${record.event} — ${messages('ackUnanswered')}`}
            </span>
            <time
                className="w-16 shrink-0 text-text-secondary"
                dateTime={new Date(entry.at).toISOString()}
            >
                {formatActivityTime(entry.at)}
            </time>
            <span className="w-13 shrink-0 text-right">{formatByteSize(entry.bytes)}</span>
        </div>
    );
}
