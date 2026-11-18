import type { z } from 'zod';

import { BrunoParseError } from './bruno-parse-error.js';
import { problemsOf } from './problems-of.js';

/** A value read from a file as the schema reads it; the problems say which file and which key. */
export function parseValue<T extends z.ZodType>(
    value: unknown,
    path: string,
    schema: T,
): z.output<T> {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        throw new BrunoParseError(problemsOf(path, parsed.error));
    }

    return parsed.data;
}
