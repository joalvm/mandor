import { degradation, interopDocumentSchema, type InteropDocument } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { collectionToInterop } from '../../../src/postman/import/collection-to-interop.js';
import { fixtureText } from '../support/fixture.js';

function readText(text: string): InteropDocument {
    const document = parsePostmanDocument(text);

    if (document.kind !== 'collection') {
        throw new Error('not a collection');
    }

    return collectionToInterop(document.collection);
}

const fixture = readText(fixtureText('collection-v2.1.json'));

function operation(name: string) {
    const found = fixture.operations.find((each) => each.name === name);

    if (found === undefined) {
        throw new Error(`no operation ${name}`);
    }

    return found;
}

describe('collectionToInterop: the fixture', () => {
    it('comes out valid for the schema of the intermediate document', () => {
        expect(interopDocumentSchema.safeParse(fixture).success).toBe(true);
    });

    it('is identified by the id Postman gave and named by the collection', () => {
        expect(fixture.name).toBe('Demo API');
        expect(fixture.sourceId).toBe('collection:11111111-aaaa-bbbb-cccc-000000000001');
        expect(fixture.servers).toEqual([]);
        expect(fixture.payloadSchemas).toEqual({});
    });

    it('keeps the variables of the collection as written, secret and bad names included', () => {
        expect(fixture.variables).toEqual([
            { name: 'base', value: 'http://127.0.0.1:1', enabled: true, secret: false },
            { name: 'apiSecret', value: 's3cret', enabled: true, secret: true },
            { name: 'bad name', value: 'x', enabled: true, secret: false },
        ]);
    });

    it('keeps the script of the collection and the auth it asks of everything', () => {
        expect(fixture.scripts).toEqual([
            {
                event: 'onBeforeRequest',
                source: "console.log('collection');",
                enabled: true,
            },
        ]);
        expect(fixture.defaultSecurity).toEqual(['collection']);
        expect(fixture.security['collection']).toEqual({
            type: 'basic',
            extras: { username: 'ana', password: 'hunter2' },
        });
    });

    it('keeps the description of the collection, and of a collection with none says nothing', () => {
        expect(fixture.description).toBe('The collection the tests read.');
        expect(
            collectionToInterop({ info: { name: 'x', schema: 'y' }, item: [] }).description,
        ).toBeUndefined();
    });

    it('reads the variables of a folder, the switched off ones too', () => {
        const [group] =
            collectionToInterop({
                info: { name: 'x', schema: 'y' },
                item: [
                    {
                        name: 'A',
                        item: [],
                        variable: [
                            { key: 'on', value: '1' },
                            { key: 'off', value: '2', disabled: true },
                        ],
                    },
                ],
            }).groups ?? [];

        expect(group?.variables).toEqual([
            { name: 'on', value: '1', enabled: true, secret: false },
            { name: 'off', value: '2', enabled: false, secret: false },
        ]);
        expect(group?.extras).toEqual({});
    });

    it('lists the folders parents first, with their auth, scripts and description', () => {
        expect(fixture.groups?.map((group) => group.path)).toEqual([['Users'], ['Users', 'Admin']]);
        expect(fixture.groups?.[0]).toMatchObject({
            description: 'Everything about users.',
            security: null,
            scripts: [],
        });
        expect(fixture.groups?.[1]).toMatchObject({
            description: 'The people in charge.',
            security: ['folder:["Users","Admin"]'],
            scripts: [{ event: 'onBeforeRequest', source: "console.log('admin');" }],
        });
        expect(fixture.security['folder:["Users","Admin"]']).toEqual({
            type: 'apikey',
            extras: { key: 'X-Admin', value: '{{key}}', in: 'header' },
        });
    });

    it('names an operation by its folders and its name, and repeats with a suffix', () => {
        const names = fixture.operations.map((each) => each.name);

        expect(names).toContain('Users / Get user');
        expect(names).toContain('Users / Get user (2)');
        expect(names).toContain('Users / Admin / List admins');
        expect(new Set(names).size).toBe(names.length);
    });

    it('gives each operation a channel of its own named the same, at its url', () => {
        expect(fixture.channels).toHaveLength(fixture.operations.length);
        expect(fixture.channels.find((each) => each.name === 'Users / Get user')?.address).toBe(
            '{{base}}/users/{id}',
        );
    });

    it('maps the get user request: url, parameters, own auth, scripts and example', () => {
        const get = operation('Users / Get user');

        expect(get.http).toMatchObject({
            method: 'GET',
            url: '{{base}}/users/{id}',
            group: ['Users'],
            security: ['request:Users / Get user'],
            summary: 'Get user',
        });
        expect(
            get.http?.parameters.map(({ name, in: where, enabled, value }) => [
                name,
                where,
                enabled,
                value,
            ]),
        ).toEqual([
            ['id', 'path', true, '7'],
            ['verbose', 'query', true, 'true'],
            ['X-Trace', 'header', false, '1'],
            ['Accept', 'header', true, 'application/json'],
        ]);
        expect(get.http?.scripts?.map((script) => script.event)).toEqual([
            'onBeforeRequest',
            'onResponse',
        ]);
        expect(get.http?.responses).toEqual([
            {
                name: 'Found',
                status: '200',
                contentType: 'application/json',
                body: '{"id":7}',
                sentWith: { parameters: [] },
            },
        ]);
        expect(fixture.security['request:Users / Get user']).toEqual({
            type: 'bearer',
            extras: { token: '{{token}}' },
        });
    });

    it('maps the url written as text, and a request written as text', () => {
        expect(operation('Users / Get user (2)').http?.url).toBe('{{base}}/users');
        expect(operation('Users / Plain').http?.url).toBe('https://example.test/plain');
    });

    it('keeps the address of a url written as an object with only its text', () => {
        expect(operation('Users / Legacy').http?.url).toBe('{{base}}/legacy');
    });

    it('declares the schemes of the requests that carry their own auth, and none for noauth', () => {
        expect(operation('Users / Legacy').http?.security).toEqual(['request:Users / Legacy']);
        expect(fixture.security['request:Users / Login']?.type).toBe('oauth2');
        expect(fixture.security['request:Users / Auth code']?.extras).toMatchObject({
            redirect_uri: 'https://oauth.pstmn.io/v1/callback',
        });
        expect(operation('Users / No auth').http?.security).toEqual([]);
        expect(operation('Users / Plain').http?.security).toBeNull();
    });

    it('keeps the settings of a request in its extras', () => {
        expect(operation('Users / Settings').extras).toMatchObject({
            protocolProfileBehavior: { followRedirects: false, disableBodyPruning: true },
        });
    });

    it('notes what it leaves behind, each once', () => {
        expect(fixture.notes).toEqual([degradation('descriptionsNotKept')]);
    });
});
