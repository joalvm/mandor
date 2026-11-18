import { describe, expect, it } from 'vitest';

import { joinedHeaders } from '../../src/snippet/joined-headers.js';

describe('the headers of a snippet, one per name', () => {
    it('joins the values of a name given twice, whatever its case, under the first spelling', () => {
        expect(
            joinedHeaders([
                ['Accept', 'text/html'],
                ['X-A', '1'],
                ['accept', 'application/json'],
            ]),
        ).toEqual([
            ['Accept', 'text/html, application/json'],
            ['X-A', '1'],
        ]);
    });
});
