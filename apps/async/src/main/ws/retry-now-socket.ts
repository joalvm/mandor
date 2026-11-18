import { failure, success, wsRetryNowRequestSchema, type Empty, type Result } from '@mandor/ipc';

import type { SocketManager } from './socket-manager.js';

/** The retry-now channel gives nothing back, so only a refusal ever carries anything. */
export async function retryNowSocket(manager: SocketManager, raw: unknown): Promise<Result<Empty>> {
    const request = wsRetryNowRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    try {
        await manager.retryNow(request.data);

        return success({});
    } catch (error) {
        return failure('unknown', String(error));
    }
}
