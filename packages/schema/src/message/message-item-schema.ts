import { z } from 'zod';

import { entityNameSchema } from '../fields/entity-name-schema.js';
import type { MessageItem } from './message-item.js';
import { MESSAGE_PAYLOAD_TYPES } from './message-payload-type.js';

/**
 * The message as one flat record, envelope name included. A channel is optional but never
 * blank: absent says nobody named it, and whitespace says the field was left half typed.
 */
export const messageItemSchema = z.object({
    name: entityNameSchema,
    channel: z.string().regex(/\S/).optional(),
    payload: z.string().default(''),
    description: z.string().optional(),
    payloadType: z.enum(MESSAGE_PAYLOAD_TYPES).default('json'),
    schema: z.string().default(''),
    expectAck: z
        .object({
            enabled: z.boolean(),
            timeoutMs: z.number().int().positive().max(3_600_000),
        })
        .optional(),
}) satisfies z.ZodType<MessageItem>;
