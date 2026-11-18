import { describe, expect, it } from 'vitest';

import { readV5 } from '../../../src/insomnia/document/read-v5.js';
import { documentsOf } from '../../../src/insomnia/export/documents-of.js';
import { websocketResourceOf } from '../../../src/insomnia/import/websocket-connection.js';
import { LOBBY, SYNC_WORKSPACE } from '../support/sample-workspace.js';

describe('a connection that leaves in Insomnia', () => {
    it('comes back as the same connection when the import reads what the export wrote', () => {
        const [file] = documentsOf({ ...SYNC_WORKSPACE, connections: [LOBBY], collections: [] });
        const [document] = readV5(file?.document);
        const [socket] = document?.children ?? [];

        expect(socket).toMatchObject({ kind: 'websocket', name: 'Lobby' });

        const resource = websocketResourceOf(
            socket as Parameters<typeof websocketResourceOf>[0],
            'workspace:wrk',
            'lobby',
        );

        expect(resource.degradations).toEqual([]);
        expect(resource.fields).toMatchObject({
            name: 'Lobby',
            url: 'wss://{{host}}/lobby',
            transport: 'websocket',
            headers: [
                { key: 'x-room', value: '7', enabled: true },
                { key: 'x-off', value: '1', enabled: false },
            ],
            params: [{ key: 'room', value: '1', enabled: true }],
            description: 'The public room',
            websocket: { subprotocols: ['chat', 'superchat'] },
            auth: { type: 'bearer', token: '{{token}}' },
        });
    });
});
