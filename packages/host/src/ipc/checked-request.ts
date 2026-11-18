import { failure, success, type Result } from '@mandor/ipc';
import type { ZodType } from 'zod';

/** What the renderer sent, as the schema reads it, or the refusal of a request that is not. */
export function checkedRequest<Input>(schema: ZodType<Input>, raw: unknown): Result<Input> {
    const request = schema.safeParse(raw);

    return request.success ? success(request.data) : failure('bad-request', request.error.message);
}
