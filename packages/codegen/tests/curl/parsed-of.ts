import { curlParseSchema } from '@mandor/schema';
import { expect } from 'vitest';

import { curlRequestOf } from '../../src/curl/curl-request-of.js';

export function row(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}

/** The result of a command that must be read, checked against the shared schema. */
export function parsedOf(text: string) {
    const result = curlRequestOf(text);

    expect(curlParseSchema.safeParse(result).success).toBe(true);

    if (result.kind !== 'parsed') {
        throw new Error(`not parsed: ${result.reason}`);
    }

    return result;
}
