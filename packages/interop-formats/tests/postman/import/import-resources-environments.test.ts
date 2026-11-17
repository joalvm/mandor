import { degradation, importResourceSchema, type InteropDocument } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { environmentResourceOf } from '../../../src/postman/import/environment-resource.js';
import { folderTreeOf } from '../../../src/postman/import/folder-resources.js';
import { importResourcesOf } from '../../../src/postman/import/import-resources.js';
import { resourceAt, resourcesOfFixture } from '../support/resources.js';

const EMPTY: InteropDocument = {
    name: 'Empty',
    sourceId: 'collection:e',
    servers: [],
    channels: [],
    operations: [],
    defaultSecurity: [],
    security: {},
    payloadSchemas: {},
    extras: {},
    notes: [],
};

describe('environment-resource: a file of environment', () => {
    it('is one environment named as the file, with the secret marked secret', async () => {
        const resources = await resourcesOfFixture('environment.json');
        const environment = resourceAt(resources, 'environment', 'local');

        expect(resources).toHaveLength(1);
        expect(importResourceSchema.safeParse(environment).success).toBe(true);
        expect(environment.fields['variables']).toEqual([
            { name: 'base', value: 'http://127.0.0.1:1', enabled: true, secret: false },
            { name: 'token', value: 'abc123', enabled: true, secret: true },
            { name: 'off', value: 'nope', enabled: false, secret: false },
        ]);
        expect(environment.degradations).toEqual([]);
    });

    it('is nothing when the document has no environment', () => {
        expect(environmentResourceOf(EMPTY)).toBeUndefined();
    });
});

describe('folder-resources: a document with little to say', () => {
    it('is only the collection when it says nothing else', () => {
        expect(importResourcesOf(EMPTY).map((each) => each.place)).toEqual(['collection']);
    });

    it('lists its environment ahead of the collection when it holds one', () => {
        const resources = importResourcesOf({
            ...EMPTY,
            environments: [{ name: 'Local', variables: [], extras: {} }],
        });

        expect(resources.map((each) => each.place)).toEqual(['environment', 'collection']);
    });

    it('puts an auth Mandor cannot hold on the collection, which enters with none, and says so', () => {
        const [collection] = importResourcesOf({
            ...EMPTY,
            defaultSecurity: ['d'],
            security: { d: { type: 'digest', extras: {} } },
        });

        expect(collection?.place).toBe('collection');
        expect(collection?.fields['auth']).toEqual({ type: 'none' });
        expect(collection?.degradations).toEqual([
            degradation('authNoEquivalentCollection', { type: 'digest' }),
        ]);
    });

    it('sends a group with a path that is not in the tree to the root', () => {
        expect(folderTreeOf(EMPTY).resources).toEqual([]);

        const resources = importResourcesOf({
            ...EMPTY,
            groups: [{ path: ['A'], security: null, scripts: [], extras: {} }],
            operations: [
                {
                    id: 'o',
                    name: 'Orphan',
                    kind: 'http',
                    extras: {},
                    http: {
                        method: 'GET',
                        url: 'http://x.test',
                        group: ['Ghost'],
                        security: null,
                        parameters: [],
                        responses: [],
                    },
                } as never,
            ],
        });

        expect(resources.map((each) => each.route)).toEqual(['empty', 'empty/a', 'empty/orphan']);
    });

    it('leaves out an operation that is no http one', () => {
        const resources = importResourcesOf({
            ...EMPTY,
            operations: [{ id: 'o', name: 'Channel', kind: 'send', extras: {} } as never],
        });

        expect(resources.map((each) => each.place)).toEqual(['collection']);
    });
});

describe('collection scripts that do not come in', () => {
    it('says why a script disabled in Postman stays out, and keeps no scripts key', () => {
        const [resource] = importResourcesOf({
            ...EMPTY,
            scripts: [
                { event: 'onResponse', dialect: 'postman', source: 'pm.test()', enabled: false },
            ],
        });

        expect(resource?.fields).not.toHaveProperty('importedScripts');
        expect(resource?.degradations).toEqual([degradation('scriptDisabled', { kind: 'test' })]);
    });
});
