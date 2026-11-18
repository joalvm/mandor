import { z } from 'zod';

/** Starting the app over is asked with nothing: there is nothing to say about it. */
export const appRelaunchRequestSchema = z.object({}).strict();
