import { describe, expect, it } from 'vitest';

import {
    treeResourcesOf,
    type TreeMakers,
    type TreeWalk,
} from '../../src/import/tree-resources.js';
import type { ImportResource } from '../../src/resource/import-resource.js';

type Folder = { kind: 'folder'; name: string; children: readonly Node[] };
type Request = { kind: 'request'; name: string };
type Node = Folder | Request;

function resourceOf(place: ImportResource['place'], route: string, name: string): ImportResource {
    return {
        place,
        itemKind: place === 'item' ? 'request' : null,
        route,
        name,
        fields: {},
        origin: { kind: 'bruno', sourceId: 's', fingerprint: 'f' },
        degradations: [],
    };
}

function walkOf(): TreeWalk {
    return { sourceId: 's', taken: new Map() };
}

const MAKERS: TreeMakers<Folder, Request> = {
    request: (node, _source, route) => resourceOf('item', route, node.name),
    folder: (node, _source, route) => resourceOf('folder', route, node.name),
    inside: (folder, route, walk) =>
        folder.children.flatMap((child) => treeResourcesOf(child, route, walk, MAKERS)),
};

describe('treeResourcesOf', () => {
    it('writes a request as one resource on the id its name takes', () => {
        const resources = treeResourcesOf(
            { kind: 'request', name: 'Listar' },
            '',
            walkOf(),
            MAKERS,
        );

        expect(resources.map(({ place, route }) => [place, route])).toEqual([['item', 'listar']]);
    });

    it('writes a folder before what hangs under it, under its route', () => {
        const folder: Folder = {
            kind: 'folder',
            name: 'Admin',
            children: [{ kind: 'request', name: 'Borrar' }],
        };

        const resources = treeResourcesOf(folder, '', walkOf(), MAKERS);

        expect(resources.map(({ place, route }) => [place, route])).toEqual([
            ['folder', 'admin'],
            ['item', 'admin/borrar'],
        ]);
    });

    it('gives a folder and a request that share a name two ids', () => {
        const walk = walkOf();
        const folder: Folder = { kind: 'folder', name: 'Admin', children: [] };

        const routes = [
            ...treeResourcesOf(folder, '', walk, MAKERS),
            ...treeResourcesOf({ kind: 'request', name: 'Admin' }, '', walk, MAKERS),
        ].map(({ route }) => route);

        expect(routes).toEqual(['admin', 'admin-2']);
    });

    it('calls a node with no name by the word of its kind', () => {
        const walk = walkOf();
        const folder: Folder = { kind: 'folder', name: '', children: [] };
        const request: Request = { kind: 'request', name: '' };

        const names = [
            ...treeResourcesOf(folder, '', walk, MAKERS),
            ...treeResourcesOf(request, '', walk, MAKERS),
        ].map(({ name }) => name);

        expect(names).toEqual(['Folder', 'Request']);
    });
});
