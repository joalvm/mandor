import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';

describe('InsomniaParseError', () => {
    it('says the first problem and carries all of them', () => {
        const error = new InsomniaParseError(['first', 'second']);

        expect(error.message).toBe('first');
        expect(error.problems).toEqual(['first', 'second']);
        expect(error.name).toBe('InsomniaParseError');
        expect(error).toBeInstanceOf(FormatInputError);
    });

    it('still has a sentence when nobody listed a problem', () => {
        expect(new InsomniaParseError([]).message).toBe('the file is not an Insomnia export');
    });
});
