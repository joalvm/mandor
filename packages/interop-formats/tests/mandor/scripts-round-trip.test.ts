import { workspaceOutline, type WorkspaceData } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { mandorCodecFor } from '../../src/mandor/mandor-codec.js';
import { asyncapiFormat } from '../../src/asyncapi/asyncapi-format.js';
import { ASYNC_WORKSPACE } from './support/sample-workspace.js';

const SOURCE = "// \u202E oculto\nmandor.variables.set('a', 1);\n\nif (ok) {\n    go();\n}\n";

function script(name: string) {
    return { onBeforeRequest: { source: `${name}()`, enabled: false } };
}

const WORKSPACE: WorkspaceData = {
    ...ASYNC_WORKSPACE,
    connections: [
        {
            id: 'pedidos',
            name: 'Pedidos',
            transport: 'websocket',
            url: 'wss://api.test/ws',
            headers: [],
            environmentId: null,
            scripts: { onMessage: { source: SOURCE } },
        },
    ],
    collections: [
        {
            name: 'Pedidos',
            settings: { variables: [], headers: [], scripts: script('collection') },
            folders: [
                {
                    name: 'Admin',
                    settings: { variables: [], headers: [], scripts: script('folder') },
                    folders: [],
                    items: [
                        {
                            kind: 'request',
                            name: 'borra',
                            tags: [],
                            body: { method: 'GET', url: '/x', scripts: script('request') },
                        },
                    ],
                },
            ],
            items: [],
        },
    ],
};

async function roundTrip(data: WorkspaceData) {
    const codec = mandorCodecFor('async');
    const files = codec.documentsOf(data).map((file) => ({
        path: file.path,
        text: codec.textOf(file.document),
    }));
    const text = files[0]?.text ?? '';
    const { resources } = await codec.read(files, 'workspace');

    return { text, resources };
}

describe('the own scripts in a bundle of Mandor', () => {
    it('leave in the file at every level, with their text and their switch', async () => {
        const { text } = await roundTrip(WORKSPACE);

        expect(text.match(/\bscripts:/gu)?.length).toBeGreaterThanOrEqual(4);
        expect(text).toContain('collection()');
        expect(text).toContain('folder()');
        expect(text).toContain('request()');
        expect(text).toContain('enabled: false');
    });

    it('come back to the same place as they were, never as an imported script', async () => {
        const { resources } = await roundTrip(WORKSPACE);
        const collection = resources.find(({ place }) => place === 'collection');
        const folder = resources.find(({ place }) => place === 'folder');
        const item = resources.find(({ place }) => place === 'item');
        const connection = resources.find(({ place }) => place === 'connection');

        expect(collection?.fields['scripts']).toEqual(script('collection'));
        expect(folder?.fields['scripts']).toEqual(script('folder'));
        expect((item?.fields as { scripts?: unknown }).scripts).toEqual(script('request'));
        expect(connection?.fields['scripts']).toEqual({ onMessage: { source: SOURCE } });
        expect(JSON.stringify(resources)).not.toContain('importedScripts');
    });

    it('are never said to be lost by Mandor, and are by a format with no script', () => {
        const kept = workspaceOutline(
            WORKSPACE,
            {},
            {
                collection: {},
                folder: {},
            },
        );
        const lost = workspaceOutline(WORKSPACE, {}, asyncapiFormat.unkept);

        expect(JSON.stringify(kept)).not.toContain('scriptsNotCarried');
        expect(JSON.stringify(lost)).toContain('scriptsNotCarried');
    });
});
