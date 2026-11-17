import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';

import { tallyOf } from '../../activity-tally.js';
import type { ActivityEntry } from '../../activity-entry.js';
import { formatByteSize } from '../../lib/format-byte-size.js';

type ActivityFootProps = {
    entries: readonly ActivityEntry[];
    /** What the narrowing of the head hides: the count the band owes saying out loud. */
    hidden: number;
    /** Lifting the filter is putting the head back at rest: a view never touched the buffer. */
    onShowAll: () => void;
};

/**
 * The foot of the timeline: what the connection moved, and — while a filter hides something —
 * what the filter hides and the way back. A short list that never said it was filtered reads as
 * a message that never arrived, so the count is said, never implied.
 */
export function ActivityFoot({ entries, hidden, onShowAll }: ActivityFootProps) {
    return (
        <p
            className="flex h-section shrink-0 items-center gap-gap-tight px-pad-panel text-xs text-text-secondary tabular-nums"
            data-part="activity-foot"
        >
            <ActivityCount entries={entries} />
            <FilterHidden hidden={hidden} onShowAll={onShowAll} />
        </p>
    );
}

function FilterHidden({ hidden, onShowAll }: Pick<ActivityFootProps, 'hidden' | 'onShowAll'>) {
    const messages = useMessages('connections');

    if (hidden <= 0) {
        return null;
    }

    return (
        <span
            className="flex items-center gap-gap-tight text-text-warning"
            data-part="activity-foot-hidden"
        >
            <span aria-hidden="true">·</span>
            <span>{messages('filterHidden', { count: hidden })}</span>
            <Button onClick={onShowAll} size="sm" variant="ghost">
                {messages('filterShowAll')}
            </Button>
        </span>
    );
}

/** The foot says what the connection moved, not what the filter leaves on screen. */
function ActivityCount({ entries }: Pick<ActivityFootProps, 'entries'>) {
    const tally = tallyOf(entries);
    const parts = [
        String(entries.length),
        `↓${String(tally.inbound.count)}·${formatByteSize(tally.inbound.bytes)}`,
        `↑${String(tally.outbound.count)}·${formatByteSize(tally.outbound.bytes)}`,
    ];

    return parts.map((part, index) => (
        <span className="flex items-center gap-gap-tight" key={index}>
            <FootSeparator index={index} />
            <span>{part}</span>
        </span>
    ));
}

function FootSeparator({ index }: { index: number }) {
    if (index === 0) {
        return null;
    }

    return <span aria-hidden="true">·</span>;
}
