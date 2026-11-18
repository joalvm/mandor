import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * What the About section tells and copies into a report: which app runs, its version and the
 * runtimes under it. Main answers it from the process itself, so the window never guesses them.
 */
export type AppAbout = {
    chrome: string;
    electron: string;
    name: string;
    node: string;
    platform: string;
    version: string;
};

/** Asking who the app is takes nothing: the answer is the same for every window. */
export const appAboutRequestSchema = z.object({}).strict();

export const appAboutSchema = z
    .object({
        chrome: z.string().min(1),
        electron: z.string().min(1),
        name: z.string().min(1),
        node: z.string().min(1),
        platform: z.string().min(1),
        version: z.string().min(1),
    })
    .strict() satisfies z.ZodType<AppAbout>;

export const appAboutResultSchema = resultSchema(appAboutSchema);
