import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import type { PostmanItem } from '../../../src/postman/document/postman-collection-schema.js';
import { PostmanParseError } from '../../../src/postman/document/postman-parse-error.js';
import { fixtureText } from '../support/fixture.js';

type Collection = Extract<ReturnType<typeof parsePostmanDocument>, { kind: 'collection' }>;

function collection(): Collection {
    const document = parsePostmanDocument(fixtureText('collection-v2.1.json'));

    if (document.kind !== 'collection') {
        throw new Error('the fixture is a collection');
    }

    return document;
}

function itemNamed(name: string, nth = 0): PostmanItem {
    const users = collection().collection.item[0];
    const found = (users?.item ?? []).filter((each) => each.name === name)[nth];

    if (found === undefined) {
        throw new Error(`no item ${name}`);
    }

    return found;
}

describe('parsePostmanDocument', () => {
    it('reads a collection and keeps the three levels of auth', () => {
        const { collection: read } = collection();
        const users = read.item[0];

        expect(read.info.name).toBe('Demo API');
        expect(read.auth?.type).toBe('basic');
        expect(users?.item?.at(-1)?.auth?.type).toBe('apikey');
        expect(itemNamed('Get user').request).toMatchObject({ auth: { type: 'bearer' } });
    });

    it('keeps the url as the file wrote it, its text and its parts, and the path variable', () => {
        expect(itemNamed('Get user').request).toMatchObject({
            url: {
                raw: '{{base}}/users/:id?verbose=true',
                host: ['{{base}}'],
                path: ['users', ':id'],
                variable: [{ key: 'id', value: '7' }],
            },
        });
        expect(itemNamed('Get user', 1).request).toMatchObject({ url: { raw: '{{base}}/users' } });
        expect(itemNamed('Plain').request).toEqual({ url: { raw: 'https://example.test/plain' } });
    });

    it('keeps the body of every mode, the example and the lines of every script', () => {
        const getUser = itemNamed('Get user');
        const upload = itemNamed('Upload').request as { body?: { formdata?: unknown[] } };

        expect(itemNamed('Query').request).toMatchObject({ body: { mode: 'graphql' } });
        expect(upload.body?.formdata).toEqual([
            { key: 'name', value: 'ana', type: 'text', contentType: 'text/plain' },
            { key: 'avatar', type: 'file', src: 'C:\\Users\\ana\\avatar.png' },
            { key: 'docs', type: 'file', src: ['a.pdf', 'b.pdf'] },
            { key: 'empty', type: 'file', src: null },
        ]);
        expect(getUser.response?.[0]).toMatchObject({ code: 200, name: 'Found' });
        expect(getUser.event?.map((event) => event.listen)).toEqual(['prerequest', 'test']);
        expect(getUser.event?.[1]?.script?.exec).toHaveLength(3);
    });

    it('keeps the id of the file, invents none, and keeps the secret type of a variable', () => {
        const { collection: read } = collection();
        const text = JSON.stringify({
            info: { name: 'No id', schema: 'https://x/collection/v2.1.0/collection.json' },
            item: [],
        });
        const other = parsePostmanDocument(text);

        expect(read.info._postman_id).toBe('11111111-aaaa-bbbb-cccc-000000000001');
        expect(read.variable?.map((variable) => variable.type)).toEqual([
            undefined,
            'secret',
            undefined,
        ]);
        expect(other).toMatchObject({ collection: { info: { name: 'No id' } } });
        expect((other as { collection: { info: object } }).collection.info).not.toHaveProperty(
            '_postman_id',
        );
    });

    it('reads an environment and globals straight from the JSON', () => {
        const environment = parsePostmanDocument(fixtureText('environment.json'));
        const globals = parsePostmanDocument(fixtureText('globals.json'));

        expect(environment).toMatchObject({ kind: 'environment', environment: { name: 'Local' } });
        expect(globals).toMatchObject({
            kind: 'globals',
            environment: { name: 'My Workspace Globals' },
        });
    });

    it('refuses text that is not JSON, and says what JSON said', () => {
        const refuse = () => parsePostmanDocument('{ nope');

        expect(refuse).toThrow(PostmanParseError);
        expect(refuse).toThrow(/^The file is not JSON: /);
    });

    it('refuses a collection v2.0 and a v1 with the one sentence of the sniffer', () => {
        expect(() => parsePostmanDocument(fixtureText('collection-v2.0.json'))).toThrow(/v2\.0/);
        expect(() => parsePostmanDocument(fixtureText('collection-v1.json'))).toThrow(/v1/);
    });

    it('refuses an environment that does not fit, one problem per issue', () => {
        const text = JSON.stringify({
            values: [{ value: 'x' }],
            _postman_variable_scope: 'environment',
        });
        let problems: string[] = [];

        try {
            parsePostmanDocument(text);
        } catch (error) {
            problems = (error as PostmanParseError).problems;
        }

        expect(problems).toEqual([
            expect.stringMatching(/^name: /),
            expect.stringMatching(/^values\.0\.key: /),
        ]);
    });
});
