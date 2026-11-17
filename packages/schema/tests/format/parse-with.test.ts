import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FormatError } from '../../src/format/format-error.js';
import { parseWith } from '../../src/format/parse-with.js';

const schema = z.object({
    name: z.string(),
    nested: z.object({ count: z.number() }),
});

function thrownBy(attempt: () => unknown): unknown {
    try {
        attempt();
    } catch (error) {
        return error;
    }

    return undefined;
}

describe('parseWith', () => {
    it('returns the data the schema read', () => {
        const input = { name: 'x', nested: { count: 2 } };

        expect(parseWith(schema, input)).toEqual(input);
    });

    it('returns what the schema made of it, defaults and strips included', () => {
        const withDefault = z.object({ on: z.boolean().default(true) });

        expect(parseWith(withDefault, { extra: 1 })).toEqual({ on: true });
    });

    it('throws a FormatError that carries the dot path of every issue', () => {
        const attempt = (): unknown => parseWith(schema, { name: 3, nested: { count: 'many' } });

        expect(attempt).toThrow(FormatError);
        expect(thrownBy(attempt)).toMatchObject({ issues: ['name', 'nested.count'] });
    });

    it('names the paths in the message, so a log line points at the field', () => {
        expect(() => parseWith(schema, { name: 'x' })).toThrow('Invalid format: nested');
    });

    it('turns an input that is not even an object into an issue at the root', () => {
        expect(() => parseWith(schema, null)).toThrow(FormatError);
    });
});
