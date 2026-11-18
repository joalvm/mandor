import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { conflictFile, conflictId, conflictsDir } from '../../src/conflict/conflict-path.js';

describe('where a conflict is kept', () => {
    it('is inside `.mandor`, so git never sees it', () => {
        expect(conflictsDir('/r')).toBe(join('/r', '.mandor', 'conflicts'));
    });

    it('names a conflict by 16 hex characters of the path, the same each time', () => {
        const id = conflictId('workspaces/pagos/collections/a.yaml');

        expect(id).toMatch(/^[0-9a-f]{16}$/);
        expect(conflictId('workspaces/pagos/collections/a.yaml')).toBe(id);
        expect(conflictId('workspaces/pagos/collections/b.yaml')).not.toBe(id);
    });

    it('joins an id into a file and refuses anything else', () => {
        expect(conflictFile('/r', '0123456789abcdef')).toBe(
            join('/r', '.mandor', 'conflicts', '0123456789abcdef.json'),
        );
        expect(() => conflictFile('/r', '../x')).toThrow(/16 hexadecimal/);
        expect(() => conflictFile('/r', '0123456789ABCDEF')).toThrow(/16 hexadecimal/);
    });
});
