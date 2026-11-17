import type { ConflictRecord } from '@mandor/schema';

export function recordOf(path: string, overrides: Partial<ConflictRecord> = {}): ConflictRecord {
    return {
        path,
        source: 'write',
        base: 'a: 1\n',
        theirs: 'a: 2\n',
        at: '2026-10-01T10:00:00.000Z',
        ...overrides,
    };
}
