import type { WorkspaceCollectionSource, WorkspaceData } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { brunoCodec } from '../../../src/bruno/bruno-codec.js';
import { readFiles } from '../../../src/bruno/import/read-files.js';
import { resourceAt } from '../support/resources.js';
import { requestOf } from '../support/sample-workspace.js';

/** A collection, a folder and a request, each with a script of its own. */
const WITH_SCRIPTS: WorkspaceCollectionSource = {
    name: 'Tienda',
    settings: {
        variables: [],
        headers: [],
        scripts: { onBeforeRequest: { source: "mandor.log('colección');" } },
    },
    folders: [
        {
            name: 'Arriba',
            settings: {
                variables: [],
                headers: [],
                scripts: { onResponse: { source: "mandor.log('carpeta');" } },
            },
            folders: [],
            items: [],
        },
    ],
    items: [
        requestOf('suelta', {
            scripts: {
                onBeforeRequest: { source: 'const a = 1;\nmandor.log(a);' },
                onResponse: { source: 'apagado();', enabled: false },
            },
        }),
    ],
};

const WORKSPACE: WorkspaceData = {
    name: 'Tienda',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [WITH_SCRIPTS],
};

async function resourcesAfterExport() {
    const files = brunoCodec
        .documentsOf(WORKSPACE)
        .map((file) => ({ path: file.path, text: brunoCodec.textOf(file.document) }));

    return (await readFiles(files)).resources;
}

describe('scripts through the files of Bruno', () => {
    it('brings each script back to its level and its moment, with the same text', async () => {
        const resources = await resourcesAfterExport();

        expect(resourceAt(resources, 'collection', 'tienda').fields['scripts']).toEqual({
            onBeforeRequest: { source: "mandor.log('colección');" },
        });
        expect(resourceAt(resources, 'folder', 'tienda/arriba').fields['scripts']).toEqual({
            onResponse: { source: "mandor.log('carpeta');" },
        });
        expect(resourceAt(resources, 'item', 'tienda/suelta').fields['scripts']).toEqual({
            onBeforeRequest: { source: 'const a = 1;\nmandor.log(a);' },
        });
    });
});
