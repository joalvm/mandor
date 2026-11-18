import { success, type Err, type Result } from '@mandor/ipc';
import type { ZodType } from 'zod';

import { activeRoot } from '../origin/active-root.js';
import { checkedRequest } from './checked-request.js';
import { failureOf } from './failure-of.js';

/**
 * The three steps every handler that touches the disk of the active origin takes before it does
 * any work: check what the renderer sent, find out where the work lives, and turn whatever the
 * store threw into a refusal that crosses the bridge. Written once so an area of six channels
 * reads as six lines of intent instead of six copies of the same preamble. A channel whose
 * faults mean something else than the default says so in `onError`.
 */
export function rootedHandler<Input, Value>(
    schema: ZodType<Input>,
    run: (root: string, input: Input) => Promise<Value>,
    onError: (error: unknown) => Err = failureOf,
): (raw: unknown) => Promise<Result<Value>> {
    return async (raw) => {
        const request = checkedRequest(schema, raw);

        if (!request.ok) {
            return request;
        }

        const root = activeRoot();

        if (!root.ok) {
            return root;
        }

        try {
            return success(await run(root.value, request.value));
        } catch (error) {
            return onError(error);
        }
    };
}
