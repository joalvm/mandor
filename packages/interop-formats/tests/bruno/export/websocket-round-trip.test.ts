import type { WorkspaceData } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { brunoCodec } from '../../../src/bruno/bruno-codec.js';
import { readFiles } from '../../../src/bruno/import/read-files.js';
import { EVENTS, MASCOTAS, LOBBY } from '../support/sample-workspace.js';

function workspaceOf(overrides: Partial<WorkspaceData>): WorkspaceData {
    return {
        name: 'Tienda',
        connections: [LOBBY, EVENTS],
        environments: [],
        globals: [],
        docs: [],
        collections: [],
        ...overrides,
    };
}

async function connectionsAfterExport(data: WorkspaceData) {
    const files = brunoCodec
        .documentsOf(data)
        .map((file) => ({ path: file.path, text: brunoCodec.textOf(file.document) }));
    const read = await readFiles(files);

    return read.resources.filter((resource) => resource.place === 'connection');
}

describe('a WebSocket connection through the files of Bruno', () => {
    it('comes back with its address, headers, subprotocols, auth and notes', async () => {
        const [lobby, ...others] = await connectionsAfterExport(workspaceOf({}));

        expect(others).toEqual([]);
        expect(lobby).toMatchObject({
            name: 'Lobby',
            fields: {
                transport: 'websocket',
                url: 'wss://{{host}}/lobby?room=1',
                headers: [
                    { key: 'x-room', value: '7', enabled: true },
                    { key: 'x-off', value: '1', enabled: false },
                ],
                websocket: { subprotocols: ['chat', 'superchat'] },
                description: 'The public room',
                auth: { type: 'bearer', token: '{{token}}' },
            },
        });
    });

    it('comes back whichever collection carried it', async () => {
        const [lobby] = await connectionsAfterExport(workspaceOf({ collections: [MASCOTAS] }));

        expect(lobby?.route).toBe('lobby');
    });
});
