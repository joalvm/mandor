import { describe, expect, it } from 'vitest';

import { folderOf } from '../../../src/bruno/document/read-oc-folder.js';
import { folderNode, requestNode } from '../support/trees.js';

describe('folderOf', () => {
    it('reads what the folder file says: its place, notes, headers and auth', () => {
        const folder = folderOf(
            {
                info: { seq: 3 },
                docs: 'Una nota',
                request: {
                    headers: [{ name: 'X-Team', value: 'perros' }],
                    auth: { type: 'basic', username: 'a', password: 'b' },
                },
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

    it('is the directory alone when it has no folder file', () => {
        expect(folderOf(undefined, 'Mascotas', [])).toEqual(
            folderNode({ seq: Number.MAX_SAFE_INTEGER }),
        );
    });

    it('puts its children in order', () => {
        const folder = folderOf(undefined, 'M', [
            requestNode({ name: 'b', seq: 2 }),
            requestNode({ name: 'a', seq: 1 }),
        ]);

        expect(folder.children.map((child) => child.name)).toEqual(['a', 'b']);
    });

    it('names what the folder keeps that Mandor has no place for', () => {
        const folder = folderOf({ request: { scripts: [{ code: 'x' }], actions: [{}] } }, 'M', []);

        expect(folder.leftOut).toEqual(['scripts', 'actions']);
    });

    it('reads the variables of the folder', () => {
        const folder = folderOf({ request: { variables: [{ name: 'a', value: '1' }] } }, 'M', []);

        expect(folder.variables).toEqual([
            { name: 'a', value: '1', disabled: false, secret: false },
        ]);
    });
});
