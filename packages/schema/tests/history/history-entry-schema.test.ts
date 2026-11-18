import { describe, expect, it } from 'vitest';

import { historyEntrySchema } from '../../src/history/history-entry-schema.js';
import type { HistoryEntry } from '../../src/history/history-entry.js';

const ID = '7d9c1f0e-3b52-4a56-8d1b-6f2a9e4c7b10';

const response = {
    status: 200,
    statusText: 'OK',
    httpVersion: '1.1',
    headers: [['content-type', 'application/json']],
    body: { kind: 'inline', encoding: 'utf8', text: '{}' },
    sizes: { transferredBytes: 40, bodyBytes: 2, decoded: true },
    timings: { dnsMs: 1, connectMs: 2, tlsMs: 3, firstByteMs: 4, totalMs: 12, viaProxy: false },
    redirects: [],
    cookies: [],
};

const entry = {
    id: ID,
    workspaceId: 'pagos',
    itemPath: 'pedidos/crear',
    environmentId: null,
    sentAt: '2026-09-23T10:15:30.123Z',
    request: {
        method: 'POST',
        url: 'http://localhost:3000/pedidos?x=1',
        headers: [['content-type', 'application/json']],
        body: { kind: 'inline', encoding: 'utf8', text: '{"a":1}' },
    },
    outcome: { kind: 'response', response },
};

describe('historyEntrySchema', () => {
    it('reads an entry with a response and writes it back the same', () => {
        const parsed: HistoryEntry = historyEntrySchema.parse(entry);

        expect(parsed).toEqual(entry);
        expect(historyEntrySchema.parse(parsed)).toEqual(parsed);
    });

    it('reads the send of a request saved nowhere, which names no path', () => {
        const loose = { ...entry, itemPath: null };

        expect(historyEntrySchema.parse(loose)).toEqual(loose);
    });

    it('reads an entry whose send failed', () => {
        const failed = {
            ...entry,
            environmentId: 'local',
            request: { ...entry.request, body: null },
            outcome: { kind: 'failure', code: 'request-refused', message: 'ECONNREFUSED' },
        };

        expect(historyEntrySchema.parse(failed)).toEqual(failed);
    });

    it.each(['request', 'refused', 'Request-Refused', 'request-'])(
        'refuses `%s` as a failure code',
        (code) => {
            const failed = { ...entry, outcome: { kind: 'failure', code, message: 'x' } };

            expect(historyEntrySchema.safeParse(failed).success).toBe(false);
        },
    );

    it('refuses an id that is not a uuid, because it becomes part of a file name', () => {
        expect(historyEntrySchema.safeParse({ ...entry, id: '../x' }).success).toBe(false);
    });

    it('refuses a date that is not ISO 8601', () => {
        expect(historyEntrySchema.safeParse({ ...entry, sentAt: 'ayer' }).success).toBe(false);
    });

    it('refuses a workspace that is not an id segment', () => {
        expect(historyEntrySchema.safeParse({ ...entry, workspaceId: '../pagos' }).success).toBe(
            false,
        );
    });

    it('refuses keys it does not know, so a rewritten file cannot hide data', () => {
        expect(historyEntrySchema.safeParse({ ...entry, extra: 1 }).success).toBe(false);
        expect(
            historyEntrySchema.safeParse({ ...entry, request: { ...entry.request, extra: 1 } })
                .success,
        ).toBe(false);
    });
});
