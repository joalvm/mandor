import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

export const wsCloseRequestSchema = z.object({
    connectionId: slugSchema,
});

export type WsCloseRequest = z.infer<typeof wsCloseRequestSchema>;
