import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { collectionToInterop } from '../../../src/postman/import/collection-to-interop.js';
import { fixtureText } from '../support/fixture.js';

function bodyOf(name: string) {
    const document = parsePostmanDocument(fixtureText('collection-v2.1.json'));

    if (document.kind !== 'collection') {
        throw new Error('not a collection');
    }

    const found = collectionToInterop(document.collection).operations.find(
        (each) => each.name === name,
    );

    return found?.http?.requestBody;
}

describe('collectionToInterop: the bodies of the fixture', () => {
    it('maps the bodies of every mode', () => {
        expect(bodyOf('Users / Create user')).toMatchObject({
            contentType: 'application/json',
            value: '{"id":"{{$guid}}","email":"{{$randomEmail}}"}',
        });
        expect(
            bodyOf('Users / Upload')?.fields?.map((field) => [field.key, field.kind, field.value]),
        ).toEqual([
            ['name', 'text', 'ana'],
            ['avatar', 'file', 'C:\\Users\\ana\\avatar.png'],
            ['docs', 'file', 'a.pdf'],
            ['docs', 'file', 'b.pdf'],
            ['empty', 'file', ''],
        ]);
        expect(bodyOf('Users / Raw file')).toMatchObject({
            value: '/home/ana/data.bin',
        });
        expect(bodyOf('Users / Query')).toMatchObject({
            contentType: 'application/graphql',
            value: '{ me { id } }',
            variables: '{"a":1}',
        });
    });
});
