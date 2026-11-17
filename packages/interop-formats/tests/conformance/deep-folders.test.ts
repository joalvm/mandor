import { documentYamlOf, type WorkspaceData, type WorkspaceFolderNode } from '@mandor/interop-core';
import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { parseMandorDocument } from '../../src/mandor/document/parse-mandor-document.js';
import { documentsOf as bundleDocumentsOf } from '../../src/mandor/export/documents-of.js';
import { collectionResourcesOf } from '../../src/mandor/import/collection-resources.js';
import { collectionFilesOf } from '../../src/bruno/export/workspace-to-opencollection.js';
import { collectionDocumentOf as insomniaOf } from '../../src/insomnia/export/workspace-to-v5.js';
import { documentsOf as openapiOf } from '../../src/openapi/export/documents-of.js';
import { collectionDocumentOf as postmanOf } from '../../src/postman/export/workspace-to-collection.js';

function request(name: string): CollectionItem {
    return {
        kind: 'request',
        name,
        tags: [],
        body: { method: 'GET', url: `https://api.test/${name}` },
    };
}

function folder(
    name: string,
    folders: WorkspaceFolderNode[],
    items: CollectionItem[] = [],
): WorkspaceFolderNode {
    return { name, settings: { variables: [], headers: [] }, folders, items };
}

const COLLECTION = folder('Tienda', [
    folder('A', [folder('Hondo', [], [request('de-a')])]),
    folder('B', [folder('Hondo', [], [request('de-b')])]),
]);

const DATA: WorkspaceData = {
    name: 'Tienda',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [COLLECTION],
};

/** A nested document as the names on the way to each leaf, under the key its format nests by. */
function leavesOf(level: unknown, key: string, above: string[] = []): string[] {
    const { name, [key]: children } = level as Record<string, unknown>;
    const here = [...above, String(name)];

    if (!Array.isArray(children)) {
        return [here.join('/')];
    }

    return children.flatMap((child) => leavesOf(child, key, here));
}

const LEAVES = ['Tienda/A/Hondo/de-a', 'Tienda/B/Hondo/de-b'];

describe('three levels of folders in every format that writes them', () => {
    it('postman nests them, two folders of one name in their own branches', () => {
        const { info, item } = postmanOf(COLLECTION, {}) as { info: unknown; item: unknown };

        expect(leavesOf({ ...(info as object), item }, 'item')).toEqual(LEAVES);
    });

    it('insomnia nests them, two folders of one name in their own branches', () => {
        const document = insomniaOf(COLLECTION, { connections: [], environments: [], globals: [] });
        const { collection } = document as { collection: unknown };

        expect(leavesOf({ name: 'Tienda', children: collection }, 'children')).toEqual(LEAVES);
    });

    it('bruno lays them out as directories, two of one name in their own branches', () => {
        const paths = collectionFilesOf(COLLECTION, {
            connections: [],
            environments: [],
            globals: [],
        }).map((file) => file.path);

        expect(paths).toEqual([
            'opencollection.yml',
            'a/folder.yml',
            'a/hondo/folder.yml',
            'a/hondo/de-a.yml',
            'b/folder.yml',
            'b/hondo/folder.yml',
            'b/hondo/de-b.yml',
        ]);
    });

    it('openapi tags each request with its folder of the first level', () => {
        const [file] = openapiOf(DATA);
        const { paths } = file?.document as {
            paths: Record<string, { get: { tags: string[] } }>;
        };

        expect(paths['/de-a']?.get.tags).toEqual(['A']);
        expect(paths['/de-b']?.get.tags).toEqual(['B']);
    });

    it('the bundle keeps the tree through a write and a read', () => {
        const [file] = bundleDocumentsOf(DATA, 'sync');
        const read = parseMandorDocument(documentYamlOf(file?.document), 'sync');

        expect(collectionResourcesOf(read, 'Tienda').map(({ route }) => route)).toEqual([
            'tienda',
            'tienda/a',
            'tienda/a/hondo',
            'tienda/a/hondo/de-a',
            'tienda/b',
            'tienda/b/hondo',
            'tienda/b/hondo/de-b',
        ]);
    });
});
