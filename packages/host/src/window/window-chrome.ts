import type { BrowserWindowConstructorOptions } from 'electron';

type WindowChromeOptions = Pick<
    BrowserWindowConstructorOptions,
    'titleBarStyle' | 'trafficLightPosition'
>;

/**
 * Every platform hides the system title bar and keeps the row the renderer paints. macOS keeps
 * the system traffic lights and only asks them centered on the height of that row; the other
 * desktop systems get their controls from the renderer too, so no overlay is requested and the
 * system paints nothing inside the row.
 */
export function windowChromeOptions(
    platform: NodeJS.Platform = process.platform,
): WindowChromeOptions {
    if (platform === 'darwin') {
        return { titleBarStyle: 'hidden', trafficLightPosition: { x: 12, y: 11 } };
    }

    return { titleBarStyle: 'hidden' };
}
