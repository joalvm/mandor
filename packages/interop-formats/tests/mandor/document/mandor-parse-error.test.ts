import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { MandorParseError } from '../../../src/mandor/document/mandor-parse-error.js';

describe('MandorParseError', () => {
    it('carries every problem and says the first as its message', () => {
        const error = new MandorParseError(['workspace.name: invalid', 'docs.0.name: invalid']);

        expect(error.problems).toEqual(['workspace.name: invalid', 'docs.0.name: invalid']);
        expect(error.message).toBe('workspace.name: invalid');
        expect(error.name).toBe('MandorParseError');
        expect(error).toBeInstanceOf(FormatInputError);
    });

    it('still says something when there is no problem to name', () => {
        expect(new MandorParseError([]).message).toBe('the file is not an Mandor workspace');
    });
});
