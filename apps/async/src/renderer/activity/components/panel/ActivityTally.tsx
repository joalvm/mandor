import { tallyOf } from '../../activity-tally.js';
import type { ActivityEntry } from '../../activity-entry.js';
import { formatByteSize } from '../../lib/format-byte-size.js';

type ActivityTallyProps = {
    entries: readonly ActivityEntry[];
};

/**
 * What the connection moved, beside the title of the timeline: how many entries, and how many
 * arrived and left with their bytes. It counts what the timeline holds, not what the filter
 * leaves on screen, in the tertiary ink of a count read in passing.
 */
export function ActivityTally({ entries }: ActivityTallyProps) {
    const tally = tallyOf(entries);
    const inbound = `↓${String(tally.inbound.count)}·${formatByteSize(tally.inbound.bytes)}`;
    const outbound = `↑${String(tally.outbound.count)}·${formatByteSize(tally.outbound.bytes)}`;

    return (
        <span
            className="flex min-w-0 items-center gap-gap-control text-xs text-text-tertiary tabular-nums"
            data-part="activity-tally"
        >
            <span>{entries.length}</span>
            <span className="flex min-w-0 items-center gap-gap-tight truncate">
                <span>{inbound}</span>
                <span aria-hidden="true">·</span>
                <span>{outbound}</span>
            </span>
        </span>
    );
}
