import { describe, expect, it } from 'vitest';

import { pathParamsOf } from '../../src/import/path-params-of.js';

function rowOf(name: string, value: string) {
    return { name, value };
}

describe('pathParamsOf', () => {
    it('writes the declared names in braces and keeps their values apart', () => {
        const result = pathParamsOf('https://api.test/:species/pets/:id?x=1', [
            rowOf('species', 'dog'),
            rowOf('id', '7'),
        ]);

        expect(result).toEqual({
            url: 'https://api.test/{species}/pets/{id}?x=1',
            lines: [
                { key: 'species', value: 'dog', enabled: true },
                { key: 'id', value: '7', enabled: true },
            ],
        });
    });

    it('leaves alone a colon that no declared name explains', () => {
        expect(pathParamsOf('http://localhost:8080/:id/:other', [rowOf('id', '1')]).url).toBe(
            'http://localhost:8080/{id}/:other',
        );
    });

    it('does not take a name for the start of a longer one', () => {
        expect(pathParamsOf('/a/:id2/:id', [rowOf('id', '1')]).url).toBe('/a/:id2/{id}');
    });

    it('takes a name with characters a pattern would read as its own', () => {
        expect(pathParamsOf('/a/:v1.0', [rowOf('v1.0', 'x')]).url).toBe('/a/{v1.0}');
    });

    it('ignores a row with no name', () => {
        expect(pathParamsOf('/a', [rowOf('', 'x')])).toEqual({ url: '/a', lines: [] });
    });
});
