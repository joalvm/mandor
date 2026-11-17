import { describe, expect, it } from 'vitest';

import { websocketFilesOf } from '../../../src/bruno/export/websocket-files.js';
import { EVENTS, LOBBY } from '../support/sample-workspace.js';

describe('websocketFilesOf', () => {
    it('writes a file for each WebSocket connection and none for another transport', () => {
        const files = websocketFilesOf([LOBBY, EVENTS], {
            directory: { path: '', taken: [] },
            first: 3,
            inherited: undefined,
            saved: new Map(),
        });

        expect(files.map((file) => file.path)).toEqual(['lobby.yml']);
        expect(files[0]?.document).toMatchObject({ info: { name: 'Lobby', seq: 3 } });
    });

    it('numbers the connections from where the directory leaves off', () => {
        const files = websocketFilesOf([LOBBY, { ...LOBBY, id: 'other', name: 'Other' }], {
            directory: { path: '', taken: [] },
            first: 5,
            inherited: undefined,
            saved: new Map(),
        });

        expect(files.map((file) => file.document['info'])).toMatchObject([{ seq: 5 }, { seq: 6 }]);
    });

    it('keeps the names the directory holds and tells apart connections of one name', () => {
        const files = websocketFilesOf([LOBBY, { ...LOBBY, id: 'twin' }], {
            directory: { path: 'vivo', taken: ['lobby'] },
            first: 1,
            inherited: undefined,
            saved: new Map(),
        });

        expect(files.map((file) => file.path)).toEqual(['vivo/lobby-2.yml', 'vivo/lobby-3.yml']);
    });

    it('hands the auth of the workspace to a connection with none', () => {
        const [file] = websocketFilesOf([{ ...LOBBY, auth: undefined }], {
            directory: { path: '', taken: [] },
            first: 1,
            inherited: { type: 'bearer', token: '{{ws}}' },
            saved: new Map(),
        });

        expect(file?.document['websocket']).toMatchObject({
            auth: { type: 'bearer', token: '{{ws}}' },
        });
    });
});
