import { describe, expect, it } from 'vitest';

import {
    collectionSearchRequestSchema,
    collectionSearchResultSchema,
} from '../../src/collection/collection-search.js';

describe('collectionSearchRequestSchema', () => {
    it('accepts a query of two characters or more', () => {
        const request = { workspaceId: 'api-pagos', query: 'ab' };

        expect(collectionSearchRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a query too short to be worth a sweep of the disk', () => {
        const result = collectionSearchRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            query: 'a',
        });

        expect(result.success).toBe(false);
    });

    it('refuses a query longer than two hundred characters', () => {
        const result = collectionSearchRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            query: 'a'.repeat(201),
        });

        expect(result.success).toBe(false);
    });
});

describe('collectionSearchResultSchema', () => {
    const hit = { line: 3, resource: 'mandor://demo/pagos/doc/notas.md', source: 'doc' };

    it('answers with the lines that matched, and where each one lives', () => {
        const answer = { ok: true, value: [hit] };

        expect(collectionSearchResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a line that is not a positive integer', () => {
        expect(
            collectionSearchResultSchema.safeParse({ ok: true, value: [{ ...hit, line: 0 }] })
                .success,
        ).toBe(false);
        expect(
            collectionSearchResultSchema.safeParse({ ok: true, value: [{ ...hit, line: 1.5 }] })
                .success,
        ).toBe(false);
    });

    it('refuses a hit whose resource names nothing Mandor can open', () => {
        const stray = { ...hit, resource: 'https://example.com' };

        expect(collectionSearchResultSchema.safeParse({ ok: true, value: [stray] }).success).toBe(
            false,
        );
    });

    it('refuses a source that is not a doc, a folder or an item', () => {
        const stray = { ...hit, source: 'connection' };

        expect(collectionSearchResultSchema.safeParse({ ok: true, value: [stray] }).success).toBe(
            false,
        );
    });

    it('answers a failure with its code and its message', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'boom' } };
        const unknown = { ok: false, error: { code: 'nope', message: 'boom' } };

        expect(collectionSearchResultSchema.parse(failure)).toEqual(failure);
        expect(collectionSearchResultSchema.safeParse(unknown).success).toBe(false);
    });
});
