import { describe, expect, it } from 'vitest';

import type { BrunoSkipped } from '../../../src/bruno/document/bruno-tree.js';
import { dirTreeOf } from '../../../src/bruno/document/dir-tree.js';
import { nodesOfBruDir } from '../../../src/bruno/document/read-bru-tree.js';

function file(path: string, text: string) {
    return { path, text };
}

const GET = 'get {\n  url: u\n}\n';

describe('nodesOfBruDir', () => {
    it('reads a file as a request and a directory as a folder, in order', () => {
        const dir = dirTreeOf(
            [
                file('Lista.bru', 'meta {\n  name: Lista\n  seq: 2\n}\n\nget {\n  url: u\n}\n'),
                file('Mascotas/folder.bru', 'meta {\n  name: Con nombre\n  seq: 1\n}\n'),
                file('Mascotas/Alta.bru', GET),
            ],
            'folder.bru',
        );
        const nodes = nodesOfBruDir(dir, []);

        expect(nodes.map((node) => `${node.kind}:${node.name}`)).toEqual([
            'folder:Con nombre',
            'request:Lista',
        ]);
        expect(nodes[0]).toMatchObject({ children: [{ name: 'Alta' }] });
    });

    it('names a folder as its directory when it has no folder.bru or no name in it', () => {
        const dir = dirTreeOf(
            [
                file('A/x.bru', GET),
                file('B/folder.bru', 'docs {\n  Nota\n}\n'),
                file('B/y.bru', GET),
            ],
            'folder.bru',
        );

        expect(nodesOfBruDir(dir, []).map((node) => node.name)).toEqual(['A', 'B']);
    });

    it('leaves out a request that is not HTTP and says so', () => {
        const skipped: BrunoSkipped[] = [];
        const dir = dirTreeOf(
            [file('Feed.bru', 'meta {\n  name: Feed\n  type: grpc\n}\n')],
            'folder.bru',
        );

        expect(nodesOfBruDir(dir, skipped)).toEqual([]);
        expect(skipped).toEqual([{ kind: 'grpc', name: 'Feed' }]);
    });
});
