import { ACTIVITY_WINDOW_BYTES, ACTIVITY_WINDOW_ENTRIES, type ActivityRecord } from '@mandor/ipc';

const BASE64_GROUP = 4;
const BASE64_BYTES = 3;
/** The most `=` a base64 text ends with. */
const BASE64_PADDING = 2;

/**
 * At most what the window weighs the frame at, without reading it: a text has no fewer UTF-8
 * bytes than code units, and base64 carries no fewer bytes than its groups minus the padding.
 * Weighing a frame lighter keeps more of the batch, never less than the window keeps.
 */
function lightestWeight(record: ActivityRecord): number {
    if (record.binary !== true) {
        return record.data.length;
    }

    return Math.max(0, (record.data.length / BASE64_GROUP) * BASE64_BYTES - BASE64_PADDING);
}

/**
 * The tail of a batch the window keeps, under the same two caps and the same rule: the newest
 * frame always goes. A socket that floods large frames sent hundreds of megabytes a second to a
 * window that drops all but two on arrival, copied and parsed on the way and then thrown away.
 * A batch within the caps goes as it came.
 */
export function windowTail(records: ActivityRecord[]): ActivityRecord[] {
    let held = 0;
    let start = records.length;

    for (const record of records.toReversed()) {
        const weight = lightestWeight(record);
        const full = records.length - start >= ACTIVITY_WINDOW_ENTRIES;

        if (full || (start < records.length && held + weight > ACTIVITY_WINDOW_BYTES)) {
            break;
        }

        held += weight;
        start -= 1;
    }

    return start === 0 ? records : records.slice(start);
}
