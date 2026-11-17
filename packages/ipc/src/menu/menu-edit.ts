import { z } from 'zod';

/**
 * A step of the history the Edit menu asks the window to take. The editor keeps the history of
 * the document in the renderer and the menu lives in main, so the step crosses the bridge and
 * the window decides what to apply it to: the editor that holds the focus, or the field that
 * does. The menu's own roles would aim it at the browser's history, which is not the one that
 * holds the document's steps.
 */
export type MenuEditPush = {
    step: 'redo' | 'undo';
};

export const menuEditPushSchema = z
    .object({ step: z.enum(['redo', 'undo']) })
    .strict() satisfies z.ZodType<MenuEditPush>;
