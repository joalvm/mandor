import { describe, expect, it } from 'vitest';

import { collectionFilesOf } from '../../../src/bruno/export/workspace-to-opencollection.js';
import { EVENTS, LOBBY, MASCOTAS, SYNC_WORKSPACE } from '../support/sample-workspace.js';

describe('collectionFilesOf: the connections of a workspace', () => {
    it('lists the WebSocket connections beside the requests, numbered after them', () => {
        const withSockets = collectionFilesOf(MASCOTAS, {
            ...SYNC_WORKSPACE,
            connections: [LOBBY, EVENTS],
        });

        expect(withSockets.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'admin/folder.yml',
            'admin/borrarmascota.yml',
            'listamascotas.yml',
            'lobby.yml',
            'environments/prod.yml',
        ]);
        expect(withSockets[4]?.document).toMatchObject({ info: { name: 'Lobby', seq: 3 } });
    });
});
