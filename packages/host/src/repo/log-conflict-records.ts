import type { Logger } from '../log/create-logger.js';
import { onConflictRecorded, onMergeNote } from './conflict-events.js';

/**
 * Writes every clash kept, and every clash a merge settled alone, into the log. The user finds
 * out through the interface; the log is where someone asking «why does this file hold my
 * version» finds out when it happened.
 */
export function logConflictRecords(logger: Logger): () => void {
    const stopRecords = onConflictRecorded((root, path) => {
        logger.log('warn', `a change of ${path} in ${root} clashed and waits for an answer`);
    });
    const stopNotes = onMergeNote((message) => {
        logger.log('warn', message);
    });

    return () => {
        stopRecords();
        stopNotes();
    };
}
