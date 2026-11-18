import type { HistoryEntry, ResponseBody } from '@mandor/schema';

import { historyFileName } from '../../src/history/history-path.js';

const ZERO = '00000000-0000-4000-8000-';

/** A well-formed uuid for the n-th entry, so a test can name entries by number. */
export function idOf(n: number): string {
    return `${ZERO}${String(n).padStart(12, '0')}`;
}

/** The file the n-th entry is written to, sent when `entryOf` says unless `sentAt` is given. */
export function nameOf(n: number, sentAt?: string): string {
    return historyFileName(sentAt ?? entryOf(n).sentAt, idOf(n));
}

export function stored(ref: string): ResponseBody {
    return { kind: 'stored', ref, bytes: 100_000, contentType: 'application/json' };
}

type Options = {
    sentAt?: string;
    request?: ResponseBody | null;
    response?: ResponseBody | null;
};

/** An entry of a workspace named `pagos`, with a response unless the caller says otherwise. */
export function entryOf(n: number, options: Options = {}): HistoryEntry {
    return {
        id: idOf(n),
        workspaceId: 'pagos',
        itemPath: 'pedidos/crear',
        environmentId: null,
        sentAt: options.sentAt ?? new Date(Date.UTC(2026, 8, 1, 0, 0, n)).toISOString(),
        request: {
            method: 'GET',
            url: 'http://localhost/x',
            headers: [],
            body: options.request ?? null,
        },
        outcome: {
            kind: 'response',
            response: {
                status: 200,
                statusText: 'OK',
                httpVersion: '1.1',
                headers: [],
                body: options.response ?? null,
                sizes: { transferredBytes: 1, bodyBytes: 1, decoded: true },
                timings: {
                    dnsMs: 0,
                    connectMs: 0,
                    tlsMs: 0,
                    firstByteMs: 1,
                    totalMs: 2,
                    viaProxy: false,
                },
                redirects: [],
                cookies: [],
            },
        },
    };
}
