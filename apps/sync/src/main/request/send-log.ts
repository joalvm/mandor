import type { RequestSendLog } from '@mandor/ipc';

import type { SendEvent, SendObserver } from './send-event.js';

/** What the console of the window writes of a send: what left, and what came back or why not. */
export function sendLogOf(event: SendEvent): RequestSendLog {
    const { sent, outcome } = event;
    const log: RequestSendLog = { sendId: event.input.sendId };

    if (sent !== undefined) {
        log.sent = { method: sent.method, url: sent.url, headers: sent.headers };
    }

    if (!outcome.ok) {
        log.error = { code: outcome.error.code, message: outcome.error.message };

        return log;
    }

    const { status, statusText, headers, sizes, timings } = outcome.value;

    log.answer = {
        status,
        statusText,
        totalMs: timings.totalMs,
        bodyBytes: sizes.bodyBytes,
        headers,
    };

    return log;
}

/**
 * The watcher of sends that first tells the window how each one ended, then hands it to the next.
 * Telling comes first and cannot fail the next one: the push is a message, the disk is not.
 */
export function tellingSendLog(
    tell: (log: RequestSendLog) => void,
    next: SendObserver,
): SendObserver {
    return async (event) => {
        tell(sendLogOf(event));
        await next(event);
    };
}
