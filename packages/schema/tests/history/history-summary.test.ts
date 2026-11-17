import { describe, expect, it } from 'vitest';

import { historyEntrySchema } from '../../src/history/history-entry-schema.js';
import { historySummaryOf, historySummarySchema } from '../../src/history/history-summary.js';

const ID = '7d9c1f0e-3b52-4a56-8d1b-6f2a9e4c7b10';

const base = {
    id: ID,
    workspaceId: 'pagos',
    itemPath: 'pedidos/crear',
    environmentId: null,
    sentAt: '2026-09-23T10:15:30.123Z',
    request: { method: 'GET', url: 'http://localhost/x', headers: [], body: null },
};

const response = {
    status: 404,
    statusText: 'Not Found',
    httpVersion: '2',
    headers: [],
    body: null,
    sizes: { transferredBytes: 40, bodyBytes: 17, decoded: false },
    timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 4, totalMs: 12.5, viaProxy: false },
    redirects: [],
    cookies: [],
};

describe('historySummaryOf', () => {
    it('keeps what a row of the list shows for a response', () => {
        const entry = historyEntrySchema.parse({
            ...base,
            outcome: { kind: 'response', response },
        });

        const summary = historySummaryOf(entry);

        expect(summary).toEqual({
            id: ID,
            sentAt: '2026-09-23T10:15:30.123Z',
            itemPath: 'pedidos/crear',
            method: 'GET',
            url: 'http://localhost/x',
            outcome: {
                kind: 'response',
                status: 404,
                totalMs: 12.5,
                bodyBytes: 17,
                graphqlErrors: 0,
            },
        });
        expect(historySummarySchema.parse(summary)).toEqual(summary);
    });

    it('counts the errors a graphql answer carried inside its 200', () => {
        const entry = historyEntrySchema.parse({
            ...base,
            outcome: {
                kind: 'response',
                response: {
                    ...response,
                    status: 200,
                    graphqlErrors: { count: 2, messages: ['a'] },
                },
            },
        });

        expect(historySummaryOf(entry).outcome).toMatchObject({ status: 200, graphqlErrors: 2 });
    });

    it('keeps only the code of a failure, never its message', () => {
        const entry = historyEntrySchema.parse({
            ...base,
            outcome: { kind: 'failure', code: 'request-refused', message: 'ECONNREFUSED 10.0.0.1' },
        });

        expect(historySummaryOf(entry).outcome).toEqual({
            kind: 'failure',
            code: 'request-refused',
        });
    });
});
