import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { problemsOf } from '../../../src/bruno/document/problems-of.js';

function refusalOf(schema: z.ZodType, value: unknown): z.ZodError {
    const result = schema.safeParse(value);

    if (result.success) {
        throw new Error('the schema took the value');
    }

    return result.error;
}

describe('problemsOf', () => {
    it('names the file and the key of each refusal', () => {
        const schema = z.object({ info: z.object({ seq: z.number() }) });

        expect(problemsOf('a.yml', refusalOf(schema, { info: { seq: 'x' } }))).toEqual([
            'a.yml: info.seq: Invalid input: expected number, received string',
        ]);
    });

    it('names only the file when the whole value is refused', () => {
        expect(problemsOf('a.yml', refusalOf(z.object({}), 'x'))).toEqual([
            'a.yml: Invalid input: expected object, received string',
        ]);
    });
});
