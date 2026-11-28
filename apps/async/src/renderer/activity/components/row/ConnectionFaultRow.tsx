import { useLanguage, useMessages } from '@mandor/i18n';
import { ErrorIcon } from '@mandor/icons';

import type { ConnectionFaultEntry } from '../../activity-entry.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';

type ConnectionFaultRowProps = {
    entry: ConnectionFaultEntry;
};

/**
 * A network failure is one more line of the timeline, not a banner over the panel: it happened
 * at a moment, it sits at that moment among the frames, and it can be read and copied later.
 */
export function ConnectionFaultRow({ entry }: ConnectionFaultRowProps) {
    const messages = useMessages('connections');
    const errorMessages = useMessages('errors');
    const language = useLanguage();
    const fault = entry.detail;

    return (
        <div
            className="flex h-row min-w-0 flex-1 items-center gap-gap-group px-pad-control text-xs tabular-nums text-text-error"
            data-part="activity-fault-row"
        >
            <span
                aria-label={messages('stateError')}
                className="flex w-6 shrink-0 items-center justify-center"
                role="img"
            >
                <ErrorIcon size="sm" />
            </span>
            <span className="min-w-0 flex-1 truncate" data-part="activity-fault-message">
                {errorMessages(fault.code)}
            </span>
            <time className="w-16 shrink-0" dateTime={new Date(entry.at).toISOString()}>
                {formatActivityTime(entry.at, language)}
            </time>
            {/* The column of the bytes, empty: the moment stays under the moments of the frames. */}
            <span aria-hidden="true" className="w-13 shrink-0" />
        </div>
    );
}
