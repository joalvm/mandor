import type { Connection } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { collectionsToWrite } from '../../src/workspace/collections-to-write.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

const COLLECTION = {
    name: 'Pedidos',
    settings: { variables: [], headers: [] },
    folders: [],
    items: [],
};

function dataWith(parts: Partial<WorkspaceData>): WorkspaceData {
    return {
        name: 'Tienda',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections: [],
        ...parts,
    };
}

function connection(transport: Connection['transport']): Connection {
    return {
        id: 'chat',
        name: 'Chat',
        transport,
        url: 'ws://x.test',
        headers: [],
        environmentId: null,
    };
}

describe('collectionsToWrite', () => {
    it('is the collections the workspace has', () => {
        const data = dataWith({
            collections: [COLLECTION],
            globals: [{ name: 'a', value: '1', enabled: true, secret: false }],
        });

        expect(collectionsToWrite(data)).toEqual([COLLECTION]);
    });

    it('gives an empty one named after the workspace to carry what has no other home', () => {
        const carriers = [
            dataWith({ globals: [{ name: 'a', value: '1', enabled: true, secret: false }] }),
            dataWith({ connections: [connection('websocket')] }),
            dataWith({ environments: [{ id: 'dev', name: 'dev', variables: [] }] }),
        ];

        for (const data of carriers) {
            expect(collectionsToWrite(data)).toEqual([
                {
                    name: 'Tienda',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [],
                },
            ]);
        }
    });

    it('writes nothing for a workspace that holds nothing a collection could carry', () => {
        expect(collectionsToWrite(dataWith({ connections: [connection('socketio')] }))).toEqual([]);
    });
});
