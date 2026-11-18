import { describe, expect, it } from 'vitest';

import { mapPathPlaceholders, pathPlaceholdersOf } from '../../src/path/path-placeholders.js';

describe('the placeholders of the path of a url', () => {
    it('names each one once, in the order the path says them', () => {
        expect(pathPlaceholdersOf('http://api.test/{owner}/pets/{petId}/{owner}')).toEqual([
            'owner',
            'petId',
        ]);
    });

    it('leaves out the host, the query, the fragment and what is no name', () => {
        expect(pathPlaceholdersOf('http://{host}/a/{{raw}}/{}/{1x}?q={x}#{y}')).toEqual([]);
        expect(pathPlaceholdersOf('/pets/{petId}')).toEqual(['petId']);
    });

    it('puts what the replacer answers, and the placeholder back when it has nothing', () => {
        const url = 'http://api.test:80/pets/{petId}/{kind}?q={x}';

        expect(
            mapPathPlaceholders(url, (name, placeholder) => (name === 'petId' ? '7' : placeholder)),
        ).toBe('http://api.test:80/pets/7/{kind}?q={x}');
    });
});
