import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import type { BrunoSkipped } from '../../../src/bruno/document/bruno-tree.js';
import { dirTreeOf } from '../../../src/bruno/document/dir-tree.js';
import { nodesOfDir, nodesOfItems } from '../../../src/bruno/document/read-oc-tree.js';

describe('nodesOfItems', () => {
    it('reads the requests and the folders written inline, in the order they are written', () => {
        const skipped: BrunoSkipped[] = [];
        const nodes = nodesOfItems(
            [
                { info: { name: 'B', seq: 2 }, http: { url: 'b' } },
                {
                    info: { name: 'A', seq: 1 },
                    items: [{ info: { name: 'Dentro' }, graphql: { url: 'g' } }],
                },
            ],
            'items',
            skipped,
        );

        expect(nodes.map((node) => `${node.kind}:${node.name}`)).toEqual(['request:B', 'folder:A']);
        expect(skipped).toEqual([]);
    });

    it('reads an item with a websocket part as a WebSocket request, beside the requests', () => {
        const skipped: BrunoSkipped[] = [];
        const nodes = nodesOfItems(
            [
                { info: { name: 'Lista', seq: 1 }, http: { url: 'u' } },
                { info: { name: 'Feed', seq: 2 }, websocket: { url: 'wss://x' } },
            ],
            'items',
            skipped,
        );

        expect(nodes.map((node) => `${node.kind}:${node.name}`)).toEqual([
            'request:Lista',
            'websocket:Feed',
        ]);
        expect(skipped).toEqual([]);
    });

    it('names an item that has no name by its place in the list', () => {
        const nodes = nodesOfItems([{ http: {} }, { items: [] }], 'items', []);

        expect(nodes.map((node) => node.name)).toEqual(['Item 1', 'Item 2']);
    });

    it('leaves out what is neither a request nor a folder and says what it was', () => {
        const skipped: BrunoSkipped[] = [];
        const nodes = nodesOfItems(
            [{ info: { name: 'Feed', type: 'websocket' } }, { type: 'script', info: {} }, {}],
            'items',
            skipped,
        );

        expect(nodes).toEqual([]);
        expect(skipped).toEqual([
            { kind: 'websocket', name: 'Feed' },
            { kind: 'script', name: 'Item 2' },
            { kind: 'item', name: 'Item 3' },
        ]);
    });

    it('says which item is wrong when one does not read', () => {
        expect(() => nodesOfItems([{ info: { seq: 'x' } }], 'items', [])).toThrow(
            new BrunoParseError([
                'items[0]: info.seq: Invalid input: expected number, received string',
            ]),
        );
    });
});

describe('nodesOfDir', () => {
    const file = (path: string, text: string) => ({ path, text });

    it('reads a file as a request named as the file when it names none', () => {
        const dir = dirTreeOf([file('Lista.yml', 'http:\n  url: u\n')], 'folder.yml');

        expect(nodesOfDir(dir, [])).toMatchObject([{ kind: 'request', name: 'Lista', url: 'u' }]);
    });

    it('reads a file with a websocket part as a WebSocket request', () => {
        const dir = dirTreeOf(
            [file('Feed.yml', 'info:\n  name: Feed\nwebsocket:\n  url: wss://x\n')],
            'folder.yml',
        );

        expect(nodesOfDir(dir, [])).toMatchObject([
            { kind: 'websocket', name: 'Feed', url: 'wss://x' },
        ]);
    });

    it('reads a directory as a folder named by its folder file, or by the directory', () => {
        const dir = dirTreeOf(
            [
                file('A/folder.yml', 'info:\n  name: Con nombre\n'),
                file('A/x.yml', 'http:\n  url: u\n'),
                file('B/y.yml', 'http:\n  url: u\n'),
            ],
            'folder.yml',
        );
        const nodes = nodesOfDir(dir, []);

        expect(nodes.map((node) => node.name)).toEqual(['B', 'Con nombre']);
        expect(nodes[1]).toMatchObject({ kind: 'folder', children: [{ name: 'x' }] });
    });

    it('leaves out a file that is not a request and says so', () => {
        const skipped: BrunoSkipped[] = [];
        const dir = dirTreeOf([file('Feed.yml', 'info:\n  type: websocket\n')], 'folder.yml');

        expect(nodesOfDir(dir, skipped)).toEqual([]);
        expect(skipped).toEqual([{ kind: 'websocket', name: 'Feed' }]);
    });

    it('says which file is wrong when one does not read', () => {
        const dir = dirTreeOf([file('Mal.yml', '- a\n')], 'folder.yml');

        expect(() => nodesOfDir(dir, [])).toThrow('Mal.yml: the file is not YAML');
    });
});
