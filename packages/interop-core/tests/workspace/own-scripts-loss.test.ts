import type { Connection } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemNoteOf } from '../../src/workspace/unkept-of-item.js';
import { ownScriptsLossOf, type UnkeptLevels } from '../../src/workspace/unkept-parts.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import { workspaceOutline } from '../../src/workspace/workspace-outline.js';

const SCRIPTS = { onBeforeRequest: { source: 'a()' } };
const NONE: UnkeptLevels = { collection: {}, folder: {}, writesScripts: false };
const WRITES: UnkeptLevels = { collection: {}, folder: {}, writesScripts: true };
const KEEPS: UnkeptLevels = { collection: {}, folder: {} };

describe('the own scripts a format may not carry', () => {
    it('are lost by a format that writes no script, and only when there is one', () => {
        expect(ownScriptsLossOf(SCRIPTS, NONE)).toEqual(['scriptsNotCarried']);
        expect(ownScriptsLossOf({}, NONE)).toEqual([]);
        expect(ownScriptsLossOf(undefined, NONE)).toEqual([]);
    });

    it('are kept by a format that writes scripts, and by the format of Mandor', () => {
        expect(ownScriptsLossOf(SCRIPTS, WRITES)).toEqual([]);
        expect(ownScriptsLossOf(SCRIPTS, KEEPS)).toEqual([]);
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
        expect(itemNoteOf(item({ scripts: SCRIPTS }), WRITES)).toEqual({});
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

        const written = workspaceOutline(held, {}, WRITES);

        expect(written.find(({ kind }) => kind === 'collection')?.unkept).toBeUndefined();
        expect(written.find(({ id }) => id === 'connection/c')?.unkept).toEqual([
            'scriptsNotCarried',
        ]);
        expect(
            workspaceOutline(held, {}, KEEPS).find(({ id }) => id === 'connection/c')?.unkept,
        ).toBeUndefined();
    });
});
