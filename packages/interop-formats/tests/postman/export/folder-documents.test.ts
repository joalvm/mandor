import type { WorkspaceFolderNode } from '@mandor/interop-core';
import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { folderDocumentsOf } from '../../../src/postman/export/folder-documents.js';
import { MESSAGE, requestOf } from '../support/sample-workspace.js';

function folderOf(
    name: string,
    parts: Partial<WorkspaceFolderNode> = {},
    auth?: ConcreteAuth,
): WorkspaceFolderNode {
    return {
        name,
        settings: { variables: [], auth, headers: [] },
        folders: [],
        items: [],
        ...parts,
    };
}

function itemsOf(document: Record<string, unknown> | undefined): Record<string, unknown>[] {
    return (document?.['item'] ?? []) as Record<string, unknown>[];
}

describe('folderDocumentsOf', () => {
    it('writes a folder with its requests, leaving out what Postman has no place for', () => {
        const [folder] = folderDocumentsOf([
            folderOf('Admin', { items: [requestOf('borra'), MESSAGE] }),
        ]);

        expect(folder?.['name']).toBe('Admin');
        expect(itemsOf(folder).map((item) => item['name'])).toEqual(['borra']);
    });

    it('writes the auth a folder declares and none where it inherits', () => {
        const [own, plain] = folderDocumentsOf([
            folderOf('Own', {}, { type: 'bearer', token: '{{t}}' }),
            folderOf('Plain'),
        ]);

        expect(own).toHaveProperty('auth.type', 'bearer');
        expect(plain).not.toHaveProperty('auth');
    });

    it('nests a folder inside its parent, its folders before its requests', () => {
        const [top] = folderDocumentsOf([
            folderOf('Arriba', {
                folders: [folderOf('Medio', { folders: [folderOf('Hondo')] })],
                items: [requestOf('suelta')],
            }),
        ]);
        const [medio, suelta] = itemsOf(top);

        expect(medio?.['name']).toBe('Medio');
        expect(suelta?.['name']).toBe('suelta');
        expect(itemsOf(medio)[0]?.['name']).toBe('Hondo');
    });

    it('keeps apart two folders of one name in different branches', () => {
        const documents = folderDocumentsOf([
            folderOf('A', { folders: [folderOf('Hondo', { items: [requestOf('de-a')] })] }),
            folderOf('B', { folders: [folderOf('Hondo', { items: [requestOf('de-b')] })] }),
        ]);
        const names = documents.map((top) => itemsOf(itemsOf(top)[0]).map((item) => item['name']));

        expect(names).toEqual([['de-a'], ['de-b']]);
    });

    it('writes the description and variables of a folder', () => {
        const [folder] = folderDocumentsOf([
            folderOf('Admin', {
                settings: {
                    description: 'Lo suyo',
                    variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
                    headers: [],
                },
            }),
        ]);

        expect(folder).toMatchObject({
            description: 'Lo suyo',
            variable: [{ key: 'a', value: '1' }],
        });
    });

    it('writes the headers of the whole chain on each request, the closest winning', () => {
        const line = (key: string, value: string) => ({ key, value, enabled: true });
        const root = folderOf('Raiz', {
            settings: { variables: [], headers: [line('X-Raiz', 'r'), line('X-Dos', 'r')] },
        });
        const [top] = folderDocumentsOf(
            [
                folderOf('A', {
                    settings: { variables: [], headers: [line('X-Dos', 'a')] },
                    items: [requestOf('uno', { headers: [line('X-Propia', 'p')] })],
                }),
            ],
            [root],
        );
        const [request] = itemsOf(top);

        expect((request?.['request'] as { header: unknown }).header).toEqual([
            { key: 'X-Raiz', value: 'r' },
            { key: 'X-Dos', value: 'a' },
            { key: 'X-Propia', value: 'p' },
        ]);
    });
});
