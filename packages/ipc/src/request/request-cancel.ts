import { z } from 'zod';

/**
 * Cuts the send in flight that carries this id. Cutting one that already ended answers success
 * and does nothing: the user pressed Abort a moment too late, and that is not a failure.
 */
export const requestCancelRequestSchema = z.object({ sendId: z.uuid() }).strict();

export type RequestCancelRequest = z.infer<typeof requestCancelRequestSchema>;
