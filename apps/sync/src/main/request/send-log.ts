import { SEND_LOG_BODY_MAX, type RequestSendLog } from '@mandor/ipc';
import type { ResponseBody } from '@mandor/schema';

import type { SendEvent, SendObserver } from './send-event.js';

const UTF8 = new TextDecoder('utf-8', { fatal: true });

/** The first characters of a body, as the console is told them. */
function clipped(text: string): string {
    return text.length > SEND_LOG_BODY_MAX ? text.slice(0, SEND_LOG_BODY_MAX) : text;
}

/** The body that left, when it reads as text: a file or an image is no line of a console. */
function sentBodyOf(bytes: Uint8Array | undefined): { body?: string } {
    if (bytes === undefined || bytes.length === 0) {
        return {};
    }

    try {
        return { body: clipped(UTF8.decode(bytes)) };
    } catch {
        return {};
    }
}

/** The body that came back, when it stayed in memory as text; one written to disk stays there. */
function answerBodyOf(body: ResponseBody | null): { body?: string } {
    if (body?.kind !== 'inline' || body.encoding !== 'utf8' || body.text === '') {
        return {};
    }

    return { body: clipped(body.text) };
}

/** What the console of the window writes of a send: what left, and what came back or why not. */
export function sendLogOf(event: SendEvent): RequestSendLog {
    const { sent, outcome } = event;
    const log: RequestSendLog = { sendId: event.input.sendId };

    if (sent !== undefined) {
        log.sent = {
            method: sent.method,
            url: sent.url,
            headers: sent.headers,
            ...sentBodyOf(sent.bytes),
        };
    }

    if (!outcome.ok) {
        log.error = { code: outcome.error.code, message: outcome.error.message };

        return log;
    }

    const { status, statusText, headers, sizes, timings, body } = outcome.value;

    log.answer = {
        status,
        statusText,
        totalMs: timings.totalMs,
        bodyBytes: sizes.bodyBytes,
        headers,
        ...answerBodyOf(body),
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
