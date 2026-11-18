import { describe, expect, it } from 'vitest';

import { queryOfUrl } from '../../../src/bruno/import/query-of-url.js';
import { rowOf } from '../support/trees.js';

describe('queryOfUrl', () => {
    it('leaves a url with no query as it is, with the rows that were listed', () => {
        const rows = [rowOf('a', '1')];

        expect(queryOfUrl('https://api.test/pets', rows)).toEqual({
            url: 'https://api.test/pets',
            rows,
        });
    });

    it('takes the query out of the url, and keeps what the rows already said', () => {
        const result = queryOfUrl('https://api.test/pets?a=1&b=2', [rowOf('a', '1')]);

        expect(result).toEqual({
            url: 'https://api.test/pets',
            rows: [rowOf('a', '1'), rowOf('b', '2')],
        });
    });

    it('adds what the url holds when a row of the same name is switched off or says another value', () => {
        const rows = [rowOf('a', '1', { disabled: true }), rowOf('b', '9')];
        const result = queryOfUrl('u?a=1&b=2', rows);

        expect(result.rows).toEqual([...rows, rowOf('a', '1'), rowOf('b', '2')]);
    });

    it('undoes the percent-escapes and keeps a name with no value', () => {
        expect(queryOfUrl('u?q=a%20b&flag&&x=%E0%A4%A', []).rows).toEqual([
            rowOf('q', 'a b'),
            rowOf('flag'),
            rowOf('x', '%E0%A4%A'),
        ]);
    });

    it('keeps an equals sign inside a value', () => {
        expect(queryOfUrl('u?token=a=b', []).rows).toEqual([rowOf('token', 'a=b')]);
    });

    it('has no rows for an empty query', () => {
        expect(queryOfUrl('https://api.test/pets?', [])).toEqual({
            url: 'https://api.test/pets',
            rows: [],
        });
    });
});
