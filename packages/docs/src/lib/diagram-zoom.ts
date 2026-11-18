/**
 * The sizes a diagram takes, in steps. `1` is the width of the page: the stylesheet fits the
 * drawing into it, and every other step is the drawing at that multiple of its own size.
 */
export const DIAGRAM_ZOOM = [0.5, 0.75, 1, 1.5, 2, 3] as const;

/** The step a diagram opens at, and the one the fit button goes back to. */
export const DIAGRAM_FIT = 2;

/** The size of a step, as the attribute the stylesheet reads it from. */
export function diagramZoom(step: number): string {
    return String(DIAGRAM_ZOOM[step] ?? DIAGRAM_ZOOM[DIAGRAM_FIT]);
}
