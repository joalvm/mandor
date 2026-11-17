import { describe, expect, it } from 'vitest';

import { conflictRecordSchema } from '../../src/conflict/conflict-record.js';

const record = {
    path: 'workspaces/pagos/collection/pedidos/crear.yaml',
    source: 'write',
    base: 'a: 1\n',
    theirs: 'a: 2\n',
    at: '2026-10-01T10:00:00.000Z',
};

describe('conflictRecordSchema', () => {
    it('reads a record and writes it back the same', () => {
        expect(conflictRecordSchema.parse(record)).toEqual(record);
    });

    it('allows a side that does not exist', () => {
        const gone = { ...record, source: 'merge', base: null, theirs: null };

        expect(conflictRecordSchema.parse(gone)).toEqual(gone);
    });

    it.each(['', '/etc/passwd', '../fuera.yaml', 'a/../b.yaml', 'a//b.yaml', 'a\\b.yaml', 'C:/x'])(
        'refuses `%s` as a path',
        (path) => {
            expect(conflictRecordSchema.safeParse({ ...record, path }).success).toBe(false);
        },
    );

    it('refuses a source it does not know', () => {
        expect(conflictRecordSchema.safeParse({ ...record, source: 'pull' }).success).toBe(false);
    });

    it('refuses a key it does not know, because a later version must not rewrite it', () => {
        expect(conflictRecordSchema.safeParse({ ...record, mine: 'x' }).success).toBe(false);
    });

    it('refuses a date that is not ISO 8601', () => {
        expect(conflictRecordSchema.safeParse({ ...record, at: 'ayer' }).success).toBe(false);
    });
});
