import { historyEntrySchema, type HistoryEntry, type HistorySummary } from '@mandor/schema';

import { httpResponseWith } from './http-response.js';

export const ID_A = '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11';
export const ID_B = '0b7d3c9a-1f2e-4a6b-8c4d-5e6f7a8b9c0d';
export const ID_C = '3a9e5d71-4b8c-4f20-9d16-7c2b1e0a4f55';

/** One row of the list: a send that was answered with a 200, on the day and hour given. */
export function summaryOf(id: string, overrides: Partial<HistorySummary> = {}): HistorySummary {
    return {
        id,
        sentAt: '2026-09-02T10:30:00.000Z',
        itemPath: 'orders/list',
        method: 'GET',
        url: 'http://localhost/orders',
        outcome: { kind: 'response', status: 200, totalMs: 120, bodyBytes: 40, graphqlErrors: 0 },
        ...overrides,
    };
}

/** The same send in full, with a body that stayed in memory. */
export function entryOf(id: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    return historyEntrySchema.parse({
        id,
        workspaceId: 'demo',
        itemPath: 'orders/list',
        environmentId: null,
        sentAt: '2026-09-02T10:30:00.000Z',
        request: {
            method: 'GET',
            url: 'http://localhost/orders',
            headers: [['accept', 'application/json']],
            body: null,
        },
        outcome: {
            kind: 'response',
            response: httpResponseWith({
                body: { encoding: 'utf8', kind: 'inline', text: '{"ok":true}' },
                headers: [['content-type', 'application/json']],
            }),
        },
        ...overrides,
    });
}

/** A send that never got an answer. */
export function failedEntryOf(id: string, code = 'request-timeout'): HistoryEntry {
    return entryOf(id, { outcome: { kind: 'failure', code, message: 'timed out' } });
}
