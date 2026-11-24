import type { useMessages } from '@mandor/i18n';
import type { ErrorCode, RequestSendLog } from '@mandor/ipc';
import type { LogLine, LogTone } from '@mandor/ui';

import { formatBytes, formatDuration } from '../../../response/lib/format-response.js';

type Labels = {
    requests: ReturnType<typeof useMessages<'requests'>>;
    errors: ReturnType<typeof useMessages<'errors'>>;
};

/** A status a browser writes in red: the server answered, and it said no. */
const FIRST_REFUSAL = 400;

/** How an error reads when it is not a fault: a cancel is the user changing their mind. */
const ERROR_TONES: Readonly<Partial<Record<ErrorCode, LogTone>>> = { 'request-aborted': 'note' };

/** The headers one per line, `Name: value`, as they read on the wire. */
function headerText(headers: readonly (readonly [string, string])[]): string {
    return headers.map(([name, value]) => `${name}: ${value}`).join('\n');
}

function headersLine(
    key: string,
    title: string,
    headers: readonly (readonly [string, string])[] | undefined,
): LogLine[] {
    if (headers === undefined || headers.length === 0) {
        return [];
    }

    return [{ key, tone: 'note', text: title, detail: headerText(headers) }];
}

/** The send as one line: what left, then what came back or why nothing did. */
function sendLine(log: RequestSendLog, labels: Labels): LogLine {
    const left = log.sent === undefined ? [] : [`${log.sent.method} ${log.sent.url}`];

    if (log.answer !== undefined) {
        const { status, statusText, totalMs, bodyBytes } = log.answer;
        const tone: LogTone = status >= FIRST_REFUSAL ? 'error' : 'log';
        const said = [`${String(status)} ${statusText}`.trim(), formatDuration(totalMs)];

        return {
            key: 'send',
            tone,
            text: [...left, ...said, formatBytes(bodyBytes)].join(' · '),
        };
    }

    const code = log.error?.code ?? 'unknown';
    const message = log.error?.message ?? '';

    return {
        key: 'send',
        tone: ERROR_TONES[code] ?? 'error',
        text: [...left, labels.errors(code)].join(' · '),
        detail: message === '' ? undefined : message,
    };
}

/**
 * What the console writes of one send, as a browser writes a request of its page: the line of
 * the send, and under it the headers that left and those that came back.
 */
export function sendLogLines(log: RequestSendLog, labels: Labels): LogLine[] {
    return [
        sendLine(log, labels),
        ...headersLine('send-sent', labels.requests('consoleRequestHeaders'), log.sent?.headers),
        ...headersLine(
            'send-answer',
            labels.requests('consoleResponseHeaders'),
            log.answer?.headers,
        ),
    ];
}
