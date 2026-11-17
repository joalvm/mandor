import { describe, expect, it } from 'vitest';

import { requestFilesOf } from '../../../src/bruno/export/request-files.js';
import { requestOf } from '../support/sample-workspace.js';

function listed(...names: string[]) {
    return names.map((name) => requestOf(name));
}

describe('requestFilesOf', () => {
    it('writes a file for each request, named after it and numbered from where the first stands', () => {
        const files = requestFilesOf(listed('Lista', 'Alta'), { path: 'mascotas', taken: [] }, 3);

        expect(files.map((file) => file.path)).toEqual(['mascotas/lista.yml', 'mascotas/alta.yml']);
        expect(files.map((file) => file.document)).toMatchObject([
            { info: { name: 'Lista', seq: 3 } },
            { info: { name: 'Alta', seq: 4 } },
        ]);
    });

    it('writes at the root of the collection when the directory has no path', () => {
        const files = requestFilesOf(listed('Lista'), { path: '', taken: [] }, 1);

        expect(files.map((file) => file.path)).toEqual(['lista.yml']);
    });

    it('numbers names that would share a file, and keeps off the ones the directory reserves', () => {
        const taken = ['folder'];
        const files = requestFilesOf(listed('Lista', 'LISTA', 'Folder'), { path: '', taken }, 1);

        expect(files.map((file) => file.path)).toEqual([
            'lista.yml',
            'lista-2.yml',
            'folder-2.yml',
        ]);
        expect(taken).toEqual(['folder', 'lista', 'lista-2', 'folder-2']);
    });

    it('writes no file for what Bruno has no place for', () => {
        const files = requestFilesOf(
            [
                {
                    kind: 'message',
                    name: 'Aviso',
                    tags: [],
                    body: { channel: 'c', direction: 'outgoing', payload: '', payloadType: 'json' },
                },
                requestOf('Lista'),
            ],
            { path: '', taken: [] },
            1,
        );

        expect(files.map((file) => file.path)).toEqual(['lista.yml']);
        expect(files[0]?.document).toMatchObject({ info: { seq: 1 } });
    });
});
