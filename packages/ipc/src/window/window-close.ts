import { z } from 'zod';

/** Closing the window is asked with nothing: there is nothing to say about it. */
export const windowCloseRequestSchema = z.object({}).strict();
