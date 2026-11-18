import type { ActivityRecord } from '@mandor/ipc';

/**
 * The text a frame carries to the search of the timeline: the named event and the whole payload.
 * The row reads only the head of a frame, but the search asks for what the frame said — a
 * payload longer than a row is still what a query has to find.
 *
 * A frame that was never text carries its name alone: the base64 it travelled in is not what
 * arrived, and a query matching on an encoding finds things no frame said.
 */
export function messageSearchText(record: ActivityRecord): string {
    if (record.binary === true) {
        return record.event ?? '';
    }

    return [record.event ?? '', record.data].filter((part) => part !== '').join(' ');
}
