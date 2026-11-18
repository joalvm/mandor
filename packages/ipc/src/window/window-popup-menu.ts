import { z } from 'zod';

/**
 * Where the menu opens: the corner of the button that was clicked, in window coordinates.
 * Main never looks up a window by id, so the coordinates are all the renderer gets to say.
 */
export const windowPopupMenuRequestSchema = z.object({ x: z.number(), y: z.number() }).strict();

export type WindowPopupMenuRequest = z.infer<typeof windowPopupMenuRequestSchema>;
