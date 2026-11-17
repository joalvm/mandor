import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

export const wsRetryNowRequestSchema = z.object({ connectionId: slugSchema });
export type WsRetryNowRequest = z.infer<typeof wsRetryNowRequestSchema>;
