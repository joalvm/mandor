import { z } from 'zod';

/**
 * One call for both directions: the handler looks at the window and maximizes or restores it.
 * The renderer has no state of its own to argue with.
 */
export const windowToggleMaximizeRequestSchema = z.object({}).strict();
