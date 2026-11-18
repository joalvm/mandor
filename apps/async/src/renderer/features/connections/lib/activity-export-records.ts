import type { ActivityEntry } from '../../../activity/activity-entry.js';
import { directionOf } from '../../../activity/activity-tally.js';
import { activityText } from '../../../activity/activity-text.js';

/** What one line of the exported timeline says, JSONL on the way out. */
export type ActivityExportRecord = {
    at: number;
    bytes: number;
    direction?: 'in' | 'out';
    kind: string;
    text: string;
};

/**
 * The timeline as the export channel takes it: one plain record per entry. A frame says which
 * way it crossed; a fault says only what it was — a direction it never had is not invented for
 * it. The text is the same the search reads, so the file shows what the row showed.
 */
export function activityExportRecords(entries: readonly ActivityEntry[]): ActivityExportRecord[] {
    return entries.map((entry) => {
        const direction = directionOf(entry);
        const text = activityText(entry);

        return direction === undefined
            ? { at: entry.at, bytes: entry.bytes, kind: entry.kind, text }
            : { at: entry.at, bytes: entry.bytes, direction, kind: entry.kind, text };
    });
}
