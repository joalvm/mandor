import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { AsyncapiParseError } from '../../../src/asyncapi/document/asyncapi-parse-error.js';

describe('AsyncapiParseError', () => {
    it('carries what the parser complained about', () => {
        const error = new AsyncapiParseError(['servers should exist']);

        expect(error.problems).toEqual(['servers should exist']);
        expect(error.message).toBe('servers should exist');
        expect(error.name).toBe('AsyncapiParseError');
        expect(error).toBeInstanceOf(FormatInputError);
    });

    it('says something on its own when the parser said nothing usable', () => {
        expect(new AsyncapiParseError([]).message).toContain('specification');
    });
});
