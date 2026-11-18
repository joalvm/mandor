import { z } from 'zod';

/**
 * One file of an import as it crosses the border: its path relative to what the user picked, so a
 * folder keeps its shape, and its text whole. The renderer reads nothing of it; main finds the
 * format and parses.
 */
export const importFileSchema = z.object({ path: z.string().min(1), text: z.string() }).strict();

export type ImportFile = z.infer<typeof importFileSchema>;
