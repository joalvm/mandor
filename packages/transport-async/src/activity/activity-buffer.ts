import type { ActivityRecord } from './activity-record.js';

/**
 * Bounded per-connection buffer. When full, the oldest record is dropped: memory stays flat no
 * matter how busy the socket gets.
 */
export class ActivityBuffer {
    private records: ActivityRecord[] = [];

    constructor(readonly max: number) {}

    get size(): number {
        return this.records.length;
    }

    push(record: ActivityRecord): void {
        if (this.records.length >= this.max) {
            this.records.shift();
        }

        this.records.push(record);
    }

    drain(): ActivityRecord[] {
        const drained = this.records;

        this.records = [];

        return drained;
    }
}
