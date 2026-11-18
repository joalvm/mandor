import type { Channel, Result } from '@mandor/ipc';
import type { z } from 'zod';

import type { BridgeIpc } from './bridge-ipc.js';

/**
 * One `invoke` and the check of what came back. Main validates every request against the schema
 * of its channel; the bridge validates every answer against the schema of its result, because
 * the window believes what crosses here. An answer out of contract is a bug in main, thrown here
 * rather than drawn.
 */
export type BridgeCall = <T>(
    channel: Channel,
    answer: z.ZodType<Result<T>>,
    payload?: unknown,
) => Promise<Result<T>>;

export function createBridgeCall(ipc: BridgeIpc): BridgeCall {
    return async <T>(
        channel: Channel,
        answer: z.ZodType<Result<T>>,
        payload?: unknown,
    ): Promise<Result<T>> => answer.parse(await ipc.invoke(channel, payload));
}
