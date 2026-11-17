import type { InteropDocument, InteropHttpOperation, InteropOperation } from '@mandor/interop-core';
import { beforeAll, describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/har/import/import-resources.js';
import { fixtureDocument } from '../support/fixture.js';

let document: InteropDocument;

beforeAll(() => {
    document = fixtureDocument('chrome.har');
});

function firstOperation(): { operation: InteropOperation; http: InteropHttpOperation } {
    const operation = document.operations[0];

    if (operation?.http === undefined) {
        throw new Error('the recording has no request');
    }

    return { operation, http: operation.http };
}

describe('importResourcesOf a document that is not what the reader makes', () => {
    it('puts a request with no group or summary at the root, and skips one with no http', () => {
        const { operation, http } = firstOperation();
        const loose: InteropDocument = {
            ...document,
            groups: [{ path: ['host:80'], security: null, scripts: [], extras: {} }],
            operations: [
                {
                    ...operation,
                    http: { ...http, group: undefined, summary: undefined, url: undefined },
                },
                { ...operation, name: 'no http', http: undefined },
            ],
        };
        const written = importResourcesOf(loose);

        expect(written.map((resource) => resource.route)).toEqual([
            'example-app',
            'example-app/host-80',
            'example-app/api-example-test-get-users',
        ]);
        expect(written[1]?.fields['url']).toBeUndefined();
    });

    it('takes the plain word of its kind for a name an id cannot keep', () => {
        const { operation, http } = firstOperation();
        const odd: InteropDocument = {
            ...document,
            groups: [{ path: ['…'], security: null, scripts: [], extras: {} }],
            operations: [{ ...operation, http: { ...http, group: ['…'], summary: '…' } }],
        };

        expect(importResourcesOf(odd).map((resource) => resource.route)).toEqual([
            'example-app',
            'example-app/host',
            'example-app/host/request',
        ]);
    });

    it('reads a row that does not say it is on as on', () => {
        const { operation, http } = firstOperation();
        const parameters = [{ name: 'q', in: 'query' as const, required: false, value: 'x' }];
        const bare: InteropDocument = {
            ...document,
            operations: [{ ...operation, http: { ...http, parameters } }],
        };
        const item = importResourcesOf(bare).find((resource) => resource.place === 'item');

        expect(item?.fields['query']).toEqual([{ key: 'q', value: 'x', enabled: true }]);
    });

    it('writes no folder for a document that declares no groups', () => {
        const { operation, http } = firstOperation();
        const flat: InteropDocument = {
            ...document,
            groups: undefined,
            operations: [{ ...operation, http: { ...http, group: undefined } }],
        };

        expect(importResourcesOf(flat).map((resource) => resource.place)).toEqual([
            'collection',
            'item',
        ]);
    });
});
