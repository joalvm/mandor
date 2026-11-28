import type { useMessages } from '@mandor/i18n';
import type { ErrorCode, RequestSendLog } from '@mandor/ipc';
import type { ConsoleWrite } from '@mandor/shell';
import type { ConsoleLevel, ConsoleSection } from '@mandor/ui';

import { formatDuration } from '../../../response/lib/format-response.js';

type Labels = {
    requests: ReturnType<typeof useMessages<'requests'>>;
    errors: ReturnType<typeof useMessages<'errors'>>;
};

type Headers = readonly (readonly [string, string])[];

/** A status a browser writes in red: the server answered, and it said no. */
const FIRST_REFUSAL = 400;

/** How an error reads when it is not a fault: a cancel is the user changing their mind. */
const ERROR_LEVELS: Readonly<Partial<Record<ErrorCode, ConsoleLevel>>> = {
    'request-aborted': 'log',
};

/**
 * The headers as one object, `name: value`, for the tree of the console; a name sent twice keeps
 * both of its values, in the order they went.
 */
function headerTree(headers: Headers): Record<string, string | string[]> {
    const tree: Record<string, string | string[]> = {};

    for (const [name, value] of headers) {
        const before = tree[name];

        tree[name] = before === undefined ? value : [before, value].flat();
    }

    return tree;
}

function headersSection(title: string, headers: Headers | undefined): ConsoleSection[] {
    return headers === undefined || headers.length === 0
        ? []
        : [{ title, value: headerTree(headers) }];
}

/** A body that reads as JSON opens as a tree; any other text reads as it came. */
function bodyValue(body: string): unknown {
    try {
        const parsed: unknown = JSON.parse(body);

        return typeof parsed === 'object' && parsed !== null ? parsed : body;
    } catch {
        return body;
    }
}

function bodySection(title: string, body: string | undefined): ConsoleSection[] {
    return body === undefined ? [] : [{ title, value: bodyValue(body) }];
}

/** What opens under the line: what left and what came back, each part on its own. */
function sectionsOf(log: RequestSendLog, labels: Labels): ConsoleSection[] {
    const { requests } = labels;

    return [
        ...headersSection(requests('consoleRequestHeaders'), log.sent?.headers),
        ...bodySection(requests('consoleRequestBody'), log.sent?.body),
        ...headersSection(requests('consoleResponseHeaders'), log.answer?.headers),
        ...bodySection(requests('consoleResponseBody'), log.answer?.body),
    ];
}

/** Why nothing came back, as the line says it and as it reads once opened. */
function failureOf(log: RequestSendLog, labels: Labels): Pick<ConsoleWrite, 'detail' | 'level'> {
    const code = log.error?.code ?? 'unknown';
    const message = log.error?.message ?? '';
    const said = labels.errors(code);

    return {
        level: ERROR_LEVELS[code] ?? 'error',
        detail: message === '' ? said : `${said}\n${message}`,
    };
}

/**
 * What the console writes of one send, as Postman writes a request: `METHOD url` on the line,
 * the status and the time at its end, green or red, and under it, once opened, why it failed and
 * the headers and the bodies that left and came back.
 */
export function sendConsoleEntry(
    log: RequestSendLog,
    labels: Labels,
    source: string,
    language: string,
): ConsoleWrite {
    const text = log.sent === undefined ? source : `${log.sent.method} ${log.sent.url}`;
    const base = { text, source, network: true, sections: sectionsOf(log, labels) };

    if (log.answer === undefined) {
        return { ...base, ...failureOf(log, labels) };
    }

    const { status, statusText, totalMs } = log.answer;
    const refused = status >= FIRST_REFUSAL;

    return {
        ...base,
        level: refused ? 'error' : 'log',
        status: {
            text: `${String(status)} ${statusText}`.trim(),
            outcome: refused ? 'refused' : 'ok',
        },
        time: formatDuration(totalMs, language),
    };
}
