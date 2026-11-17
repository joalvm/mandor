import type { WorkspaceFolderNode } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { FOLDER_FILE, folderFilesOf } from '../../../src/bruno/export/folder-files.js';
import { requestOf } from '../support/sample-workspace.js';

const BASIC = { type: 'basic', username: 'admin', password: '{{pw}}' } as const;

function folderOf(parts: Partial<WorkspaceFolderNode> = {}): WorkspaceFolderNode {
    return {
        name: 'Admin',
        settings: { variables: [], auth: BASIC, headers: [] },
        folders: [],
        items: [requestOf('Borrar')],
        ...parts,
    };
}

function root(taken: string[] = []) {
    return { path: '', taken };
}

describe('folderFilesOf', () => {
    it('writes the file of the folder and one for each request beside it', () => {
        const files = folderFilesOf(folderOf(), 2, root());

        expect(FOLDER_FILE).toBe('folder');
        expect(files.map((file) => file.path)).toEqual(['admin/folder.yml', 'admin/borrar.yml']);
        expect(files[0]?.document).toEqual({
            info: { name: 'Admin', type: 'folder', seq: 2 },
            request: { auth: BASIC },
        });
        expect(files[1]?.document).toMatchObject({ info: { name: 'Borrar', seq: 1 } });
    });

    it('writes the description, the headers and the variables the folder declares', () => {
        const [folder] = folderFilesOf(
            folderOf({
                settings: {
                    description: 'Notas',
                    variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
                    headers: [{ key: 'X-A', value: '1', enabled: true }],
                    auth: BASIC,
                },
            }),
            1,
            root(),
        );

        expect(folder?.document).toEqual({
            info: { name: 'Admin', type: 'folder', seq: 1 },
            docs: 'Notas',
            request: {
                headers: [{ name: 'X-A', value: '1' }],
                variables: [{ name: 'zona', value: 'eu' }],
                auth: BASIC,
            },
        });
    });

    it('takes the directory from the names its parent already holds', () => {
        const taken = ['admin'];
        const files = folderFilesOf(folderOf(), 1, root(taken));

        expect(files[0]?.path).toBe('admin-2/folder.yml');
        expect(taken).toEqual(['admin', 'admin-2']);
    });

    it('keeps the requests off the name of the file of the folder', () => {
        const files = folderFilesOf(folderOf({ items: [requestOf('Folder')] }), 1, root());

        expect(files[1]?.path).toBe('admin/folder-2.yml');
    });

    it('lets its requests inherit when the folder speaks no auth', () => {
        const [folder] = folderFilesOf(
            folderOf({ settings: { variables: [], headers: [] } }),
            1,
            root(),
        );

        expect(folder?.document).toMatchObject({ request: { auth: 'inherit' } });
    });

    it('writes no auth for a folder that stops the inheritance', () => {
        const [folder] = folderFilesOf(
            folderOf({ settings: { variables: [], auth: { type: 'none' }, headers: [] } }),
            1,
            root(),
        );

        expect(folder?.document).toMatchObject({ request: {} });
        expect(folder?.document['request']).not.toHaveProperty('auth');
    });

    it('nests a folder in the directory of its parent, its folders numbered before its requests', () => {
        const hondo = folderOf({ name: 'Hondo', folders: [], items: [requestOf('Dentro')] });
        const files = folderFilesOf(
            folderOf({ name: 'Arriba', folders: [hondo], items: [requestOf('Suelta')] }),
            1,
            root(),
        );

        expect(files.map((file) => file.path)).toEqual([
            'arriba/folder.yml',
            'arriba/hondo/folder.yml',
            'arriba/hondo/dentro.yml',
            'arriba/suelta.yml',
        ]);
        expect(files[1]?.document).toMatchObject({ info: { seq: 1 } });
        expect(files[3]?.document).toMatchObject({ info: { seq: 2 } });
    });
});
