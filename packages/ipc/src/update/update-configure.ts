import { z } from 'zod';

/** How much the app does by itself: look and download, look and tell, or only when asked. */
export const UPDATE_MODES = ['auto', 'notify', 'manual'] as const;

/** Which feed the app follows. Beta also receives every stable version once it is the newer. */
export const UPDATE_CHANNEL_NAMES = ['stable', 'beta'] as const;

export type UpdateChannel = (typeof UPDATE_CHANNEL_NAMES)[number];

/**
 * What the person chose in the settings, which live in the window: main cannot read them, and
 * it looks for versions on its own, so the window hands them over when it is up and at each change.
 */
export const updateConfigureRequestSchema = z
    .object({ mode: z.enum(UPDATE_MODES), channel: z.enum(UPDATE_CHANNEL_NAMES) })
    .strict();

export type UpdateConfigureRequest = z.infer<typeof updateConfigureRequestSchema>;
