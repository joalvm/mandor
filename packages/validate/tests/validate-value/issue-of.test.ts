import { describe, expect, it } from 'vitest';

import { schemaPlacesOf } from '../../src/schema-places/schema-places.js';
import { issueOf } from '../../src/validate-value/issue-of.js';

describe('issueOf', () => {
    it('keeps the words of the checker for a code it does not know', () => {
        const error = {
            type: 'error' as const,
            name: 'ValueNotEmptyError',
            code: 'value-not-empty-error',
            message: 'the value is empty',
            data: { pointer: '#/a', schema: {}, value: '' },
        };

        expect(issueOf(error, schemaPlacesOf({}))).toEqual({
            path: '/a',
            keyword: 'value-not-empty-error',
            params: {},
            schemaPath: '',
            message: 'the value is empty',
        });
    });
});
