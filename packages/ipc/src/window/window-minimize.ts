import { z } from 'zod';

/**
 * Minimizing the window has no parameters and accepts none: the window is the one that sent
 * the message, and a renderer that could name another window would own it.
 */
export const windowMinimizeRequestSchema = z.object({}).strict();
