import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import { parseValue } from '../../../src/bruno/document/parse-value.js';

describe('parseValue', () => {
    it('gives the value as the schema reads it', () => {
        expect(parseValue({ a: 1, b: 2 }, 'x.yml', z.object({ a: z.number() }))).toEqual({ a: 1 });
    });

    it('refuses what the schema refuses, saying which file and which key', () => {
        expect(() => parseValue({ a: 'x' }, 'x.yml', z.object({ a: z.number() }))).toThrow(
            new BrunoParseError(['x.yml: a: Invalid input: expected number, received string']),
        );
    });
});
