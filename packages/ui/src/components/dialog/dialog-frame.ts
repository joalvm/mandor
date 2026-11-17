/**
 * The frame every modal of the window is drawn in. A dialog that asks and a dialog that holds a
 * form differ in behaviour — who may dismiss them, where the focus starts — and never in look, so
 * the look is written once, here, and both wear it.
 *
 * The scrim is also the box that centres the surface. Centring by translating half the size
 * lands a surface of odd height on half a pixel, and every line of text on it goes soft; a flex
 * box puts it on whole pixels and gives it the inset of the window to stay within.
 */
export const DIALOG_SCRIM =
    'fixed inset-0 z-dialog flex items-center justify-center bg-surface-overlay p-gap-section';

/**
 * The surface: a step of light above the window, the faintest line the system draws at its edge
 * and a shadow with distance in it. The corners are rounder than a control's, because a dialog
 * is an object that floats over the window and not a part of it. The grid it lays its parts on,
 * and the size it takes from what it holds, are named in `runtime.css`.
 */
export const DIALOG_SURFACE =
    'relative grid max-h-full max-w-full min-h-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-dialog text-text-primary shadow-dialog';

/**
 * The name of the dialog: the largest words on it, and the only bold. It wraps instead of
 * cutting, because it names the exact object the dialog is about, and a name cut in half is the
 * one thing a confirmation cannot afford.
 */
export const DIALOG_TITLE = 'text-lg font-semibold wrap-break-word';
