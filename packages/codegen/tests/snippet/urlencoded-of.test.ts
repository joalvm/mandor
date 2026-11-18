import { describe, expect, it } from 'vitest';

import { urlencodedOf } from '../../src/snippet/urlencoded-of.js';

describe('the text of a urlencoded body', () => {
    it('encodes every name and value, a name given twice kept twice', () => {
        expect(
            urlencodedOf([
                ['a b', '1&2'],
                ['a b', 'é='],
            ]),
        ).toBe('a%20b=1%262&a%20b=%C3%A9%3D');
    });
});
