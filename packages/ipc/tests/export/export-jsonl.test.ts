import { describe, expect, it } from 'vitest';

import { exportJsonlRequestSchema, exportJsonlResultSchema } from '../../src/index.js';

const request = {
    suggestedName: 'activity.jsonl',
    records: [{ at: '2026-09-01T10:00:00.000Z', text: 'hello' }],
};

describe('the request of the jsonl export', () => {
    it('takes a name to suggest and the records to write', () => {
        expect(exportJsonlRequestSchema.parse(request)).toEqual(request);
    });

    /** The exporter serialises what it is given: a record is an object, of any shape. */
    it('accepts records of a shape the contract does not name', () => {
        const parsed = exportJsonlRequestSchema.parse({
            suggestedName: 'run.jsonl',
            records: [{ method: 'GET', status: 200, headers: { accept: 'text/plain' } }],
        });

        expect(parsed.records[0]).toEqual({
            method: 'GET',
            status: 200,
            headers: { accept: 'text/plain' },
        });
    });

    it('refuses a file name that is empty', () => {
        expect(exportJsonlRequestSchema.safeParse({ ...request, suggestedName: '' }).success).toBe(
            false,
        );
    });

    it('refuses records that are not a list of objects', () => {
        expect(exportJsonlRequestSchema.safeParse({ ...request, records: ['hello'] }).success).toBe(
            false,
        );
    });
});

describe('the answer of the jsonl export', () => {
    it('carries the path that was written', () => {
        const parsed = exportJsonlResultSchema.parse({
            ok: true,
            value: { path: '/home/user/activity.jsonl' },
        });

        expect(parsed).toEqual({ ok: true, value: { path: '/home/user/activity.jsonl' } });
    });

    /** Closing the dialog is an answer, not a failure: nothing was written and nothing broke. */
    it('carries nothing when the user closed the dialog', () => {
        expect(exportJsonlResultSchema.parse({ ok: true, value: { path: null } })).toEqual({
            ok: true,
            value: { path: null },
        });
    });

    it('refuses an answer that carries the records back', () => {
        const answer = {
            ok: true,
            value: { path: '/home/user/activity.jsonl', records: [{ text: 'hello' }] },
        };

        expect(exportJsonlResultSchema.safeParse(answer).success).toBe(false);
    });
});
