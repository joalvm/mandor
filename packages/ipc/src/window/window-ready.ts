import { z } from 'zod';

/** The window says it has drawn what it restored with nothing: the moment is the whole message. */
export const windowReadyRequestSchema = z.object({}).strict();
