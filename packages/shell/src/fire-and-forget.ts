import { reportFault } from './fault/report-fault.js';

/**
 * Lets go of a promise the window does not wait for. Bridge calls answer Result, so whatever
 * rejects here is a fault of the code: it goes to the log, not to nobody, and never reaches the
 * console as a loose rejection. A target that is not there leaves nothing to wait for.
 */
export function fireAndForget(request: Promise<unknown> | undefined): void {
    if (request === undefined) {
        return;
    }

    request.catch((error: unknown) => {
        reportFault('unawaited', error);
    });
}
