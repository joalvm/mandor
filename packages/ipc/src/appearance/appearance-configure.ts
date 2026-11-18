import { z } from 'zod';

/** What the system is told to look like: its own appearance, or one of the two it can hold. */
export const APPEARANCE_SOURCES = ['system', 'light', 'dark'] as const;

export type AppearanceSource = (typeof APPEARANCE_SOURCES)[number];

/**
 * The colour scheme the window asks the system to draw its own parts in (scrollbars, the title
 * bar, menus, dialogs). The theme is chosen in the window, which main cannot read, so the
 * window hands the scheme over when it is up and at each change.
 */
export const appearanceConfigureRequestSchema = z
    .object({ source: z.enum(APPEARANCE_SOURCES) })
    .strict();

export type AppearanceConfigureRequest = z.infer<typeof appearanceConfigureRequestSchema>;
