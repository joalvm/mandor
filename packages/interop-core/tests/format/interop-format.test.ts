import { describe, expect, it } from 'vitest';

import { INTEROP_INPUTS } from '../../src/format/interop-input.js';
import type { InteropCodec, InteropFormat, InteropRead } from '../../src/format/interop-format.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

const WORKSPACE: WorkspaceData = {
    name: 'Vacio',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [],
};

const READ: InteropRead = { name: 'Vacio', resources: [] };

describe('a format the pipeline is handed', () => {
    it('loads its codec only when asked, so the app lists it without paying for its parser', async () => {
        let loaded = 0;
        const codec: InteropCodec = {
            read: () => Promise.resolve(READ),
            documentsOf: (data) => [{ path: 'vacio.json', document: { name: data.name } }],
            textOf: (document) => JSON.stringify(document),
        };
        const format: InteropFormat = {
            id: 'prueba',
            label: 'Prueba',
            reads: ['json'],
            writes: ['json'],
            scopes: ['collection'],
            input: 'file',
            unwritten: {},
            unkept: { collection: {}, folder: {} },
            sniff: (files) => files.every((file) => file.text.startsWith('{')),
            load: () => {
                loaded += 1;

                return Promise.resolve(codec);
            },
        };

        expect(loaded).toBe(0);

        const ready = await format.load();
        const written = ready.documentsOf(WORKSPACE).map((file) => ({
            path: file.path,
            text: ready.textOf(file.document),
        }));

        expect(loaded).toBe(1);
        expect(written).toEqual([{ path: 'vacio.json', text: '{"name":"Vacio"}' }]);
        expect(await ready.read([{ path: 'a.json', text: '{}' }], 'collection')).toEqual(READ);
    });

    it('names the three things a person can pick to import it', () => {
        expect(INTEROP_INPUTS).toEqual(['file', 'files', 'folder']);
    });
});
