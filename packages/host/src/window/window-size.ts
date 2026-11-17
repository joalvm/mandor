/**
 * The geometry every Mandor window opens at. The design system draws its measurements — a
 * sidebar of 260, a centre split in halves, an address bar that has to fit a URL — against
 * this width, so the app is only ever seen at the size it was laid out for.
 *
 * The minimums are the point below which the two centre panels stop being two panels.
 */
export const WINDOW_SIZE = {
    width: 1294,
    height: 807,
    minWidth: 1024,
    minHeight: 640,
} as const;
