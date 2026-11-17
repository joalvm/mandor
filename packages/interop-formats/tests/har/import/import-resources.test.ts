import {
    degradation,
    importResourceSchema,
    type ImportResource,
    type InteropDocument,
} from '@mandor/interop-core';
import { folderSettingsSchema, requestItemSchema } from '@mandor/schema';
import { beforeAll, describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/har/import/import-resources.js';
import { fixtureDocument } from '../support/fixture.js';

let document: InteropDocument;
let resources: ImportResource[] = [];

function at(route: string): ImportResource {
    const found = resources.find((resource) => resource.route === route);

    if (found === undefined) {
        throw new Error(`no resource at "${route}"`);
    }

    return found;
}

beforeAll(() => {
    document = fixtureDocument('chrome.har');
    resources = importResourcesOf(document);
});

describe('importResourcesOf the folders and requests of a recording', () => {
    it('writes the folders first, one per host, then the requests of each', () => {
        expect(resources.map((resource) => resource.route)).toEqual([
            'example-app',
            'example-app/api-example-test',
            'example-app/cdn-example-test',
            'example-app/api-example-test/get-users',
            'example-app/api-example-test/get-users-2',
            'example-app/api-example-test/post-users',
            'example-app/cdn-example-test/post-upload',
            'example-app/cdn-example-test/get-logo-png',
        ]);
        expect(resources.map((resource) => resource.place)).toEqual([
            'collection',
            'folder',
            'folder',
            'item',
            'item',
            'item',
            'item',
            'item',
        ]);
    });

    it('names a folder by its host and a request by its summary', () => {
        expect(at('example-app/api-example-test')).toMatchObject({
            name: 'api.example.test',
            itemKind: null,
        });
        expect(at('example-app/api-example-test/get-users-2')).toMatchObject({
            name: 'GET /users (2)',
            itemKind: 'request',
        });
    });

    it('gives every resource the har origin of the document', () => {
        for (const resource of resources) {
            expect(resource.origin).toMatchObject({ kind: 'har', sourceId: document.sourceId });
        }
    });

    it('passes the schemas the host checks with', () => {
        for (const resource of resources) {
            expect(importResourceSchema.safeParse(resource).success).toBe(true);

            const parsed =
                resource.place === 'folder'
                    ? folderSettingsSchema.safeParse({ ...resource.fields, name: resource.name })
                    : requestItemSchema.safeParse({ ...resource.fields, name: resource.name });

            expect(parsed.success).toBe(true);
        }
    });
});

describe('importResourcesOf the request', () => {
    it('keeps the url without the query, and the query in its rows', () => {
        const users = at('example-app/api-example-test/get-users');

        expect(users.fields['url']).toBe('https://api.example.test/users');
        expect(users.fields['query']).toEqual([{ key: 'page', value: '1', enabled: true }]);
        expect(users.fields['method']).toBe('GET');
    });

    it('keeps every header as it came, credentials too', () => {
        const users = at('example-app/api-example-test/get-users');

        expect(users.fields['headers']).toEqual([
            {
                key: 'Authorization',
                value: expect.not.stringMatching(/^$/u) as string,
                enabled: true,
            },
            { key: 'Cookie', value: expect.not.stringMatching(/^$/u) as string, enabled: true },
            { key: 'Accept', value: 'application/json', enabled: true },
        ]);
    });

    it('says the entries that were merged into it, and keeps their answers as examples', () => {
        const users = at('example-app/api-example-test/get-users');

        expect(users.degradations).toContainEqual(
            degradation('harEntriesCombined', { count: '1' }),
        );
        expect(users.fields['examples']).toHaveLength(2);
    });

    it('keeps a json body', () => {
        expect(at('example-app/api-example-test/post-users').fields['body']).toEqual({
            type: 'json',
            content: '{"name":"Ada"}',
        });
    });

    it('turns a multipart body into a form and says the file to copy', () => {
        const upload = at('example-app/cdn-example-test/post-upload');

        expect(upload.fields['body']).toEqual({
            type: 'form',
            fields: [
                { key: 'title', value: 'Logo', enabled: true, kind: 'text' },
                { key: 'file', value: 'logo.png', enabled: true, kind: 'file' },
            ],
        });
        expect(upload.degradations).toContainEqual(
            degradation('fileFieldToCopy', { name: 'logo.png', key: 'file' }),
        );
    });

    it('keeps the example of a binary response empty and says it', () => {
        const logo = at('example-app/cdn-example-test/get-logo-png');

        expect(logo.fields['examples']).toEqual([
            { name: '200 OK', status: '200', contentType: 'image/png', body: '' },
        ]);
        expect(logo.degradations).toEqual([degradation('harResponseBinary', { name: '200 OK' })]);
    });

    it('says each sentence once', () => {
        for (const resource of resources) {
            expect(new Set(resource.degradations).size).toBe(resource.degradations.length);
        }
    });

    it('computes the fingerprint of what it writes, the one an update compares', () => {
        const [first, second] = [
            at('example-app/api-example-test/get-users'),
            at('example-app/api-example-test/get-users-2'),
        ];

        expect(first.origin.fingerprint).toMatch(/\S/);
        expect(first.origin.fingerprint).not.toBe(second.origin.fingerprint);
    });
});
