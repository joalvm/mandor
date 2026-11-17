import { ActivityBuffer } from './activity-buffer.js';
import type { ActivityRecord } from './activity-record.js';

/**
 * Turns a stream of frames into batches. A socket at 5k msg/s must not become 5k emissions
 * per second: a full batch flushes at once, a partial one flushes when its window closes,
 * whichever comes first. `dispose` drops what is buffered — teardown answers nobody.
 */
export class ActivityBatcher {
    private readonly buffer: ActivityBuffer;
    private flushTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly emit: (records: ActivityRecord[]) => void,
        private readonly batchSize: number,
        private readonly batchWindowMs: number,
        bufferMax: number,
    ) {
        this.buffer = new ActivityBuffer(bufferMax);
    }

    record(record: ActivityRecord): void {
        this.buffer.push(record);

        if (this.buffer.size >= this.batchSize) {
            this.flush();

            return;
        }

        this.flushTimer ??= setTimeout(() => {
            this.flushTimer = undefined;
            this.flush();
        }, this.batchWindowMs);
    }

    flush(): void {
        if (this.flushTimer !== undefined) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }

        const records = this.buffer.drain();

        if (records.length === 0) {
            return;
        }

        this.emit(records);
    }

    dispose(): void {
        if (this.flushTimer !== undefined) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
    }
}
