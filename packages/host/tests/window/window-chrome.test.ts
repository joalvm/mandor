import { describe, expect, it } from 'vitest';

import { windowChromeOptions } from '../../src/window/window-chrome.js';

describe('the shared window chrome', () => {
    /**
     * The renderer paints its own controls, so an overlay drawn by the system would sit over
     * them with its own color and height and could never be aligned with the row.
     */
    it('hides the title bar and asks for no overlay on Windows and Linux', () => {
        expect(windowChromeOptions('win32')).toEqual({ titleBarStyle: 'hidden' });
        expect(windowChromeOptions('linux')).toEqual({ titleBarStyle: 'hidden' });
    });

    /**
     * The system keeps drawing the traffic lights on macOS; the position is the only way to
     * center them on the height of the row the app owns.
     */
    it('places the macOS traffic lights at the height of the title row', () => {
        expect(windowChromeOptions('darwin')).toEqual({
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 12, y: 11 },
        });
    });
});
