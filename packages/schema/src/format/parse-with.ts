import type { z } from 'zod';

import { FormatError } from './format-error.js';

/** The one place zod issues become a domain error. Never `.parse()` loose. */
export function parseWith<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);

    if (result.success) {
        return result.data;
    }

    const issues = result.error.issues.map((issue) => issue.path.join('.'));

    throw new FormatError(issues);
}
