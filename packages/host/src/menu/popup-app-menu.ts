import type { OpenedMenu } from './install-app-menu.js';

/**
 * Opens the options menu under a point of the window, which is how the menu button reaches
 * it: the corner the renderer measured is the corner the menu appears at. Electron resolves
 * the coordinates against the window it is given, so nothing here needs to know where the
 * window is on the screen.
 *
 * The corner arrives in CSS pixels, and a window on a scaled display measures fractions of
 * one. Electron takes only whole numbers there and throws over the argument instead of
 * rounding it, so the rounding happens here, at the edge, and the menu opens.
 */
export function popupAppMenu(menu: OpenedMenu, window: unknown, x: number, y: number): void {
    menu.popup({ window, x: Math.round(x), y: Math.round(y) });
}
