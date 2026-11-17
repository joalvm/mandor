import type { Connection } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemNoteOf } from '../../src/workspace/unkept-of-item.js';
import { nativeScriptsLossOf, type UnkeptLevels } from '../../src/workspace/unkept-parts.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import { workspaceOutline } from '../../src/workspace/workspace-outline.js';

const SCRIPTS = { onBeforeRequest: { source: 'a()' } };
const NONE: UnkeptLevels = { collection: {}, folder: {}, scriptsIn: 'none' };
const KEEPS: UnkeptLevels = { collection: {}, folder: {} };

describe('the own scripts a format may not carry', () => {
    it('are lost by a format that writes no script, and only when there is one', () => {
        expect(nativeScriptsLossOf(SCRIPTS, NONE)).toEqual(['scriptsNotCarried']);
        expect(nativeScriptsLossOf({}, NONE)).toEqual([]);
        expect(nativeScriptsLossOf(undefined, NONE)).toEqual([]);
    });

    it('are kept by a format that names no dialect, and never turned into a foreign one', () => {
        expect(nativeScriptsLossOf(SCRIPTS, KEEPS)).toEqual([]);
        expect(nativeScriptsLossOf(SCRIPTS, { ...KEEPS, scriptsIn: 'postman' })).toEqual([
            'scriptsNotCarried',
        ]);
    });

    it('are told of on a request that holds them', () => {
        const item = (body: Record<string, unknown>) => ({
            kind: 'request',
            name: 'Pide',
            tags: [],
            body,
        });

        expect(itemNoteOf(item({ scripts: SCRIPTS }), NONE)).toEqual({
            unkept: ['scriptsNotCarried'],
        });
        expect(itemNoteOf(item({ scripts: {} }), NONE)).toEqual({});
        expect(itemNoteOf(item({ scripts: 'no es un mapa' }), NONE)).toEqual({});
        expect(itemNoteOf(item({ scripts: SCRIPTS }), KEEPS)).toEqual({});
    });

    it('are told of on the level and the connection that hold them', () => {
        const connection: Connection = {
            id: 'c',
            name: 'C',
            transport: 'websocket',
            url: 'wss://x.test',
            headers: [],
            environmentId: null,
            scripts: { onMessage: { source: 'a()' } },
        };
        const held: WorkspaceData = {
            name: 'Pasarela',
            connections: [connection],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'API',
                    settings: { variables: [], headers: [], scripts: SCRIPTS },
                    folders: [
                        {
                            name: 'A',
                            settings: { variables: [], headers: [], scripts: SCRIPTS },
                            folders: [],
                            items: [],
                        },
                    ],
                    items: [],
                },
            ],
        };
        const nodes = workspaceOutline(held, {}, NONE);
        const collection = nodes.find(({ kind }) => kind === 'collection');
        const socket = nodes.find(({ id }) => id === 'connection/c');

        expect(collection?.unkept).toEqual(['scriptsNotCarried']);
        expect(collection?.children[0]?.unkept).toEqual(['scriptsNotCarried']);
        expect(socket?.unkept).toEqual(['scriptsNotCarried']);
    });
});
