import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { OpenapiParseError } from '../../../src/openapi/document/openapi-parse-error.js';

describe('a document that refuses to be read', () => {
    it('carries what the validator complained about and says the first of it', () => {
        const error = new OpenapiParseError(['info.version is missing', 'paths is missing']);

        expect(error).toBeInstanceOf(FormatInputError);
        expect(error.name).toBe('OpenapiParseError');
        expect(error.message).toBe('info.version is missing');
        expect(error.problems).toEqual(['info.version is missing', 'paths is missing']);
    });

    it('still says something when nobody said what is wrong', () => {
        expect(new OpenapiParseError([]).message).toBe(
            'the document does not meet the specification',
        );
    });
});
