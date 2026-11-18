import { describe, expect, it } from 'vitest';

import { levelOfBru } from '../../../src/bruno/document/read-bru-level.js';

describe('levelOfBru', () => {
    it('reads what a folder.bru or a collection.bru says', () => {
        const level = levelOfBru({
            path: 'folder.bru',
            text: 'meta {\n  name: Admin\n  seq: 2\n}\n\nauth {\n  mode: inherit\n}\n',
        });

        expect(level).toMatchObject({
            meta: { name: 'Admin', seq: '2' },
            auth: { mode: 'inherit' },
        });
    });

    it('has no level for a folder or a collection with no such file', () => {
        expect(levelOfBru(undefined)).toEqual({});
    });

    it('says which file is wrong', () => {
        expect(() => levelOfBru({ path: 'Admin/folder.bru', text: 'headers {\n  a' })).toThrow(
            'Admin/folder.bru: Line 2, col 4:',
        );
    });
});
