import type { InteropFormat } from '@mandor/interop-core';
import type { Err, Result } from '@mandor/ipc';
import { z, type ZodType } from 'zod';

import { formatOf } from '../interop/format-of.js';
import { checkedRequest } from './checked-request.js';
import { failureOf } from './failure-of.js';
import { rootedHandler } from './rooted-handler.js';

/**
 * A rooted handler for a request that names one of the formats the app lists: the request is
 * checked, the format is found among the listed ones, and only then does the work start with
 * the format in hand. A format the app did not list is refused before any disk is touched.
 */
export function formattedHandler<Input extends { format: string }, Value>(
    schema: ZodType<Input>,
    formats: readonly InteropFormat[],
    run: (root: string, format: InteropFormat, input: Input) => Promise<Value>,
    onError: (error: unknown) => Err = failureOf,
): (raw: unknown) => Promise<Result<Value>> {
    return async (raw) => {
        const request = checkedRequest(schema, raw);

        if (!request.ok) {
            return request;
        }

        const format = formatOf(formats, request.value.format);

        if (!format.ok) {
            return format;
        }

        return rootedHandler(
            z.unknown(),
            (root) => run(root, format.value, request.value),
            onError,
        )(null);
    };
}
