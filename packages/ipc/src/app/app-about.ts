import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * What the About section tells and copies into a report: which app runs, its version and the
 * runtimes under it. Main answers it from the process itself, so the window never guesses them.
 */
export type AppAbout = {
    /** The processor the build runs on, as Node names it: `x64`, `arm64`. */
    arch: string;
    chrome: string;
    electron: string;
    /** The mark of the app as a PNG data address, or empty when the install carries none. */
    icon: string;
    name: string;
    node: string;
    platform: string;
    /** The version of the operating system, as the system itself numbers it. */
    system: string;
    version: string;
};

/** Asking who the app is takes nothing: the answer is the same for every window. */
export const appAboutRequestSchema = z.object({}).strict();

export const appAboutSchema = z
    .object({
        arch: z.string().min(1),
        chrome: z.string().min(1),
        electron: z.string().min(1),
        // Only an image the window can draw without reaching anywhere: the policy lets data in.
        icon: z.union([z.literal(''), z.string().startsWith('data:image/png;base64,')]),
        name: z.string().min(1),
        node: z.string().min(1),
        platform: z.string().min(1),
        system: z.string().min(1),
        version: z.string().min(1),
    })
    .strict() satisfies z.ZodType<AppAbout>;

export const appAboutResultSchema = resultSchema(appAboutSchema);
