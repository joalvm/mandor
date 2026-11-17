import { z } from 'zod';

/** Opening the licenses takes nothing: main knows where they are, the window cannot name a path. */
export const appOpenLicensesRequestSchema = z.object({}).strict();
