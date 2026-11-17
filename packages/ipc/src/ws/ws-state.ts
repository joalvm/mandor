import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { wsFailureReasonSchema, type WsFailureReason } from './ws-failure-reason.js';

/** The life of a socket in main, in the terms the tab needs to paint its state dot. */
export type WsState =
    'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error' | 'reconnecting';

const wsStateSchema = z.enum([
    'idle',
    'connecting',
    'open',
    'closing',
    'closed',
    'error',
    'reconnecting',
]) satisfies z.ZodType<WsState>;

/** Main pushes one of these every time a socket changes state; `attempt` marks a retry push. */
export type WsStatePush = {
    attempt?: number | undefined;
    connectionId: string;
    /** Why the attempt a retry push follows could not open. Absent: a live socket dropped. */
    reason?: WsFailureReason | undefined;
    state: WsState;
};

export const wsStatePushSchema = z.object({
    attempt: z.number().optional(),
    connectionId: slugSchema,
    reason: wsFailureReasonSchema.optional(),
    state: wsStateSchema,
}) satisfies z.ZodType<WsStatePush>;
