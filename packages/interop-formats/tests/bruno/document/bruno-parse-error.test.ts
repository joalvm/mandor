import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';

describe('BrunoParseError', () => {
    it('carries every problem and says the first as its message', () => {
        const error = new BrunoParseError(['a.yml: broken', 'b.yml: broken']);

        expect(error).toBeInstanceOf(FormatInputError);
        expect(error.name).toBe('BrunoParseError');
        expect(error.message).toBe('a.yml: broken');
        expect(error.problems).toEqual(['a.yml: broken', 'b.yml: broken']);
    });

    it('still says something when there is no problem to name', () => {
        expect(new BrunoParseError([]).message).toBe('the folder is not a collection of Bruno');
    });
});
