import { describe, expect, it } from 'vitest';

import { folderOfBru } from '../../../src/bruno/document/read-bru-folder.js';
import { levelOfBru } from '../../../src/bruno/document/read-bru-level.js';
import { folderNode, requestNode } from '../support/trees.js';

describe('folderOfBru', () => {
    it('reads what the folder.bru says: its place, notes, headers and auth', () => {
        const folder = folderOfBru(
            {
                meta: { seq: '3' },
                docs: 'Una nota',
                headers: [{ name: 'X-Team', value: 'perros', enabled: true }],
                auth: { mode: 'basic', basic: { username: 'a', password: 'b' } },
            },
            'Mascotas',
            [],
        );

        expect(folder).toEqual(
            folderNode({
                seq: 3,
                description: 'Una nota',
                headers: [{ name: 'X-Team', value: 'perros', disabled: false }],
                auth: { type: 'basic', username: 'a', password: 'b' },
            }),
        );
    });

    it('is the directory alone when it has no folder.bru', () => {
        expect(folderOfBru(levelOfBru(undefined), 'Mascotas', [])).toEqual(
            folderNode({ seq: Number.MAX_SAFE_INTEGER }),
        );
    });

    it('puts its children in order', () => {
        const folder = folderOfBru(levelOfBru(undefined), 'M', [
            requestNode({ name: 'b', seq: 2 }),
            requestNode({ name: 'a', seq: 1 }),
        ]);

        expect(folder.children.map((child) => child.name)).toEqual(['a', 'b']);
    });

    it('names what the folder keeps that Mandor has no place for', () => {
        const folder = folderOfBru(
            { script: { req: 'x()' }, tests: 'test(1)', vars: { req: [{ name: 'a' }] } },
            'M',
            [],
        );

        expect(folder.leftOut).toEqual(['scripts', 'tests']);
    });

    it('reads the variables of the folder', () => {
        const folder = folderOfBru({ vars: { req: [{ name: 'a', value: '1' }] } }, 'M', []);

        expect(folder.variables).toEqual([
            { name: 'a', value: '1', disabled: false, secret: false },
        ]);
    });
});
