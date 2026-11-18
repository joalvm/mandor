import { interopDocumentSchema, type InteropDocument } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { collectionToInterop } from '../../../src/postman/import/collection-to-interop.js';

function readText(text: string): InteropDocument {
    const document = parsePostmanDocument(text);

    if (document.kind !== 'collection') {
        throw new Error('not a collection');
    }

    return collectionToInterop(document.collection);
}

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function collectionText(item: unknown[], more: Record<string, unknown> = {}): string {
    return JSON.stringify({ info: { name: 'c', schema: SCHEMA }, item, ...more });
}

describe('collectionToInterop: names', () => {
    it('keeps two sibling folders of the same name apart, in the groups and in the operations', () => {
        const folder = (name: string) => ({
            name,
            item: [{ name: 'Get', request: { method: 'GET', url: 'https://x.test' } }],
        });
        const document = readText(
            collectionText([folder('Users'), folder('Users'), folder('Users (2)')]),
        );

        expect(document.groups?.map((group) => group.path)).toEqual([
            ['Users'],
            ['Users (2)'],
            ['Users (2) (2)'],
        ]);
        expect(document.operations.map((each) => each.name)).toEqual([
            'Users / Get',
            'Users (2) / Get',
            'Users (2) (2) / Get',
        ]);
        expect(interopDocumentSchema.safeParse(document).success).toBe(true);
    });

    it('does not mistake a folder called Users/Admin for Users and Admin', () => {
        const get = { name: 'Get', request: { method: 'GET', url: 'https://x.test' } };
        const document = readText(
            collectionText([
                { name: 'Users/Admin', item: [get] },
                { name: 'Users', item: [{ name: 'Admin', auth: { type: 'noauth' }, item: [get] }] },
            ]),
        );

        expect(document.groups?.map((group) => group.path)).toEqual([
            ['Users/Admin'],
            ['Users'],
            ['Users', 'Admin'],
        ]);
        expect(interopDocumentSchema.safeParse(document).success).toBe(true);
    });

    it('names a folder and a request with no name, and sits a request at the root', () => {
        const document = readText(
            collectionText([
                { item: [{ request: { method: 'GET', url: 'https://x.test' } }] },
                { name: '  ', request: { method: 'GET', url: '' } },
            ]),
        );

        expect(document.groups?.map((group) => group.path)).toEqual([['folder']]);
        expect(document.operations.map((each) => each.name)).toEqual([
            'folder / request',
            'request',
        ]);
        expect(document.operations[1]?.http?.group).toBeUndefined();
        expect(document.channels[1]?.address).toBe('/');
    });

    it('leaves out an item that is neither a folder nor a request', () => {
        const document = collectionToInterop({
            info: { name: 'c', schema: SCHEMA, _postman_id: 'x' },
            item: [{ name: 'ghost' }],
        });

        expect(document.operations).toEqual([]);
        expect(document.groups).toEqual([]);
    });
});

describe('collectionToInterop: a collection with nothing in it', () => {
    it('has no default security, no variables and no scripts, and the name of the id when absent', () => {
        const document = readText(collectionText([]));

        expect(document).toMatchObject({
            defaultSecurity: [],
            variables: [],
            scripts: [],
            groups: [],
            security: {},
        });
        expect(document.sourceId).toMatch(/^collection:[0-9a-f]{64}$/);
        expect(interopDocumentSchema.safeParse(document).success).toBe(true);
    });

    it('asks for no default security from noauth, and keeps a disabled variable', () => {
        const document = readText(
            collectionText([], {
                auth: { type: 'noauth' },
                variable: [{ key: 'a', value: 'b', disabled: true }],
            }),
        );

        expect(document.defaultSecurity).toEqual([]);
        expect(document.variables).toEqual([
            { name: 'a', value: 'b', enabled: false, secret: false },
        ]);
    });
});
