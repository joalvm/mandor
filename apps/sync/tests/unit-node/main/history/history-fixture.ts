import type { ErrorCode } from '@mandor/ipc';
import { createRequestItem, type HttpResponse, type ResponseBody } from '@mandor/schema';

import type { RecordedSend } from '../../../../src/main/history/history-entry-of.js';

const ZERO = '00000000-0000-4000-8000-';

/** A well-formed uuid for the n-th send, so a test can name sends by number. */
export function idOf(n: number): string {
    return `${ZERO}${String(n).padStart(12, '0')}`;
}

export function responseOf(
    body: ResponseBody | null,
    headers: [string, string][] = [],
): HttpResponse {
    return {
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers,
        body,
        sizes: { transferredBytes: 1, bodyBytes: 1, decoded: true },
        timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 1, totalMs: 2, viaProxy: false },
        redirects: [],
        cookies: [],
    };
}

type Options = {
    sentAt?: Date;
    bytes?: Uint8Array | undefined;
    headers?: [string, string][];
    response?: HttpResponse;
};

/** A send of the workspace `pagos` that ended with a response, as the recorder is told of it. */
export function sendOf(root: string, n: number, options: Options = {}): RecordedSend {
    return {
        root,
        input: {
            sendId: idOf(n),
            workspaceId: 'pagos',
            itemPath: 'pedidos/crear',
            environmentId: null,
            request: createRequestItem({ name: 'Crear' }),
        },
        startedAt: options.sentAt ?? new Date(Date.UTC(2026, 8, 1, 0, 0, n)),
        sent: {
            method: 'POST',
            url: 'http://localhost/pedidos',
            headers: options.headers ?? [],
            bytes: options.bytes,
        },
        outcome: { ok: true, value: options.response ?? responseOf(null) },
    };
}

/** The same send, but it ended without a response. */
export function failedSendOf(root: string, n: number, code: ErrorCode): RecordedSend {
    return {
        ...sendOf(root, n),
        outcome: { ok: false, error: { code, message: 'it failed' } },
    };
}
