import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { PostmanParseError } from '../../../src/postman/document/postman-parse-error.js';

describe('PostmanParseError', () => {
    it('carries the problems and says the first as its message', () => {
        const error = new PostmanParseError(['first', 'second']);

        expect(error.problems).toEqual(['first', 'second']);
        expect(error.message).toBe('first');
        expect(error.name).toBe('PostmanParseError');
        expect(error).toBeInstanceOf(FormatInputError);
    });

    it('still has a message when nothing was said', () => {
        expect(new PostmanParseError([]).message).toBe('the file is not a Postman export');
    });
});
