import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { HarParseError } from '../../../src/har/document/har-parse-error.js';

describe('HarParseError', () => {
    it('carries the problems and says the first as its message', () => {
        const error = new HarParseError(['first', 'second']);

        expect(error.problems).toEqual(['first', 'second']);
        expect(error.message).toBe('first');
        expect(error.name).toBe('HarParseError');
        expect(error).toBeInstanceOf(FormatInputError);
    });

    it('still has a message when nothing was said', () => {
        expect(new HarParseError([]).message).toBe('the HAR cannot be read');
    });
});
