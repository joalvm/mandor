import type { RecordPickRequest } from './record-pick.js';
import type { RecordRevealRequest } from './record-reveal.js';
import type { RecordStartRequest } from './record-start.js';
import type { RecordStatePush } from './record-state.js';
import type { RecordStatus, RecordStatusRequest } from './record-status.js';
import type { RecordStopRequest, RecordStopped } from './record-stop.js';
import type { Empty, Result } from '../result/result.js';

/**
 * The recording of one connection: pick the file, start, stop, and the state it pushes as the
 * file grows. The file is main's to write; the window only asks, answers and reads.
 */
export type RecordArea = {
    /** Asks main for the save dialog of the operating system; null when it was cancelled. */
    pick: (input: RecordPickRequest) => Promise<Result<{ path: string | null }>>;
    /** Writes the activity of one connection to the path the user picked. */
    start: (input: RecordStartRequest) => Promise<Result<Empty>>;
    /** Closes the stream and answers where the file stayed and how much it holds. */
    stop: (input: RecordStopRequest) => Promise<Result<RecordStopped>>;
    /** Whether one connection is being written right now, and how much it holds. */
    status: (input: RecordStatusRequest) => Promise<Result<RecordStatus>>;
    /** Asks the operating system to show one file the app wrote, where it lives. */
    reveal: (input: RecordRevealRequest) => Promise<Result<Empty>>;
    onState: (handler: (push: RecordStatePush) => void) => () => void;
};
