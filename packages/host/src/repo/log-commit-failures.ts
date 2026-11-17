import type { Logger } from '../log/create-logger.js';
import { onCommitFailed } from './commit-events.js';

/**
 * Writes a commit git refused into the log. Nothing is lost when it happens: the paths go back
 * to their key and the next flush tries again. The log is where a user who never sees the
 * history finds out why it has a hole. Answers how to stop.
 */
export function logCommitFailures(logger: Logger): () => void {
    return onCommitFailed((root, error) => {
        logger.log(
            'warn',
            `a commit of ${root} was refused and will be tried again: ${String(error)}`,
        );
    });
}
