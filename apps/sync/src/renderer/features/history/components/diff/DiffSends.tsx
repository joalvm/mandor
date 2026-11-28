import { useLanguage, useMessages } from '@mandor/i18n';
import type { HistoryEntry } from '@mandor/schema';

import { formatSentDay, formatSentTime } from '../../lib/format-sent-time.js';

type DiffSendsProps = {
    earlier: HistoryEntry;
    later: HistoryEntry;
};

type SendProps = {
    caption: string;
    entry: HistoryEntry;
};

const BAND = 'flex h-section min-w-0 items-center gap-gap-control px-pad-panel text-xs';

/** One of the two sends: which side it is, what it asked and when it left. */
function Send({ caption, entry }: SendProps) {
    const language = useLanguage();

    return (
        <div className={BAND} data-part="diff-send">
            <span className="shrink-0 text-2xs tracking-wide text-text-secondary uppercase">
                {caption}
            </span>
            <span className="shrink-0 font-semibold text-text-secondary">
                {entry.request.method}
            </span>
            <span className="min-w-0 truncate text-text-primary">{entry.request.url}</span>
            <span className="ms-auto shrink-0 tabular-nums text-text-secondary">
                {formatSentDay(entry.sentAt, language)} · {formatSentTime(entry.sentAt, language)}
            </span>
        </div>
    );
}

/** The two sends the comparison is about, the older first: which is which is the first thing read. */
export function DiffSends({ earlier, later }: DiffSendsProps) {
    const labels = useMessages('history');

    return (
        <div className="grid shrink-0 grid-cols-2" data-part="diff-sends">
            <Send caption={labels('diffEarlier')} entry={earlier} />
            <Send caption={labels('diffLater')} entry={later} />
        </div>
    );
}
