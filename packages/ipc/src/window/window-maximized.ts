import { z } from 'zod';

/** Main pushes one of these every time the window enters or leaves the maximized state. */
export type WindowMaximizedPush = {
    maximized: boolean;
};

export const windowMaximizedPushSchema = z
    .object({ maximized: z.boolean() })
    .strict() satisfies z.ZodType<WindowMaximizedPush>;
