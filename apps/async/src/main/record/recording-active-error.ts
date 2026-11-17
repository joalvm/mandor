/**
 * A start asked for a connection that is already being written, or whose file is still opening:
 * one connection is recorded into one file at a time.
 */
export class RecordingActiveError extends Error {
    constructor(readonly connectionId: string) {
        super(`already recording ${connectionId}`);
        this.name = 'RecordingActiveError';
    }
}
