import { degradation, type ImportResource } from '@mandor/interop-core';
import { beforeAll, describe, expect, it } from 'vitest';

import { postmanCollectionSchema } from '../../../src/postman/document/postman-collection-schema.js';
import { collectionToInterop } from '../../../src/postman/import/collection-to-interop.js';
import { collectionResourcesOf } from '../../../src/postman/import/import-resources.js';
import { resourceAt, resourcesOfFixture } from '../support/resources.js';

describe('request-resource: what each request of the collection becomes', () => {
    let resources: ImportResource[] = [];
    const item = (route: string) => resourceAt(resources, 'item', `demo-api/users/${route}`);

    beforeAll(async () => {
        resources = await resourcesOfFixture('collection-v2.1.json');
    });

    it('rewrites the dynamic variables Mandor has and says which it has not', () => {
        const create = item('create-user');

        expect(create.fields['body']).toEqual({
            type: 'json',
            content: '{"id":"{{$uuid}}","email":"{{$randomEmail}}"}',
        });
        expect(create.degradations).toEqual([
            degradation('dynamicVariableUnsupported', { name: '$randomEmail' }),
        ]);
    });

    it('names the files of a form and leaves out the row with no file', () => {
        const upload = item('upload');
        const body = upload.fields['body'] as { fields: { key: string; value: string }[] };

        expect(body.fields.map((each) => each.key)).toContain('avatar');
        expect(body.fields.find((each) => each.key === 'avatar')?.value).toBe('avatar.png');
        expect(body.fields.map((each) => each.key)).not.toContain('empty');
        expect(upload.degradations.some(({ values }) => values['name'] === 'avatar.png')).toBe(
            true,
        );
    });

    it('keeps the file of a binary body by name and the query of a graphql one', () => {
        expect(item('raw-file').fields['body']).toEqual({ type: 'binary', file: 'data.bin' });
        expect(item('query').fields['body']).toEqual({
            type: 'graphql',
            query: '{ me { id } }',
            variables: '{"a":1}',
        });
    });

    it('enters a request with no auth when Postman asked for an auth Mandor does not have', () => {
        const legacy = item('legacy');

        expect(legacy.fields['auth']).toEqual({ type: 'none' });
        expect(legacy.degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'digest' }),
        ]);
        expect(item('no-auth').fields['auth']).toEqual({ type: 'none' });
    });

    it('keeps an oauth2 grant as it came, its secret too', () => {
        const login = item('login');

        expect(login.fields['auth']).toMatchObject({
            type: 'oauth2-client-credentials',
            clientSecret: 'literal-secret',
            clientAuth: 'basic',
            scope: 'read',
        });
        expect(login.degradations).toEqual([]);
        expect(item('auth-code').fields['auth']).toMatchObject({ type: 'oauth2-code-pkce' });
        expect(item('auth-code').degradations).toHaveLength(2);
    });

    it('takes the settings Mandor has and names the ones it has not', () => {
        const settings = item('settings');

        expect(settings.fields['settings']).toMatchObject({ followRedirects: false });
        expect(settings.degradations).toEqual([
            degradation('settingNoEquivalent', { key: 'disableBodyPruning' }),
        ]);
    });

    it('keeps a request that came as a bare url, with the examples of one that had them', () => {
        expect(item('plain').fields['url']).toBe('https://example.test/plain');
        expect(item('get-user').fields['examples']).toHaveLength(1);
    });

    it('has a fingerprint that follows the content and not the order', async () => {
        const again = await resourcesOfFixture('collection-v2.1.json');
        const first = item('get-user');

        expect(resourceAt(again, 'item', 'demo-api/users/get-user').origin.fingerprint).toBe(
            first.origin.fingerprint,
        );
        expect(item('get-user-2').origin.fingerprint).not.toBe(first.origin.fingerprint);
    });

    it('lists folders and requests as the collection mixes them, parents first', () => {
        const resources = collectionResourcesOf(
            collectionToInterop(
                postmanCollectionSchema.parse({
                    info: { name: 'Mezcla', schema: 'x' },
                    item: [
                        { name: 'Uno', request: 'https://x/1' },
                        {
                            name: 'Carpeta',
                            item: [{ name: 'Dentro', request: 'https://x/2' }],
                        },
                        { name: 'Dos', request: 'https://x/3' },
                    ],
                }),
            ),
        );

        expect(resources.map(({ name }) => name)).toEqual([
            'Mezcla',
            'Uno',
            'Carpeta',
            'Dentro',
            'Dos',
        ]);
    });
});
