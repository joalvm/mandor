import { describe, expect, it, vi } from 'vitest';

import { popupAppMenu } from '../../src/menu/popup-app-menu.js';

describe('opening the options menu under a point', () => {
    it('opens at the corner the renderer measured, resolved against the window it names', () => {
        const menu = { popup: vi.fn() };
        const window = { id: 3 };

        popupAppMenu(menu, window, 12, 39);

        expect(menu.popup).toHaveBeenCalledWith({ window, x: 12, y: 39 });
    });

    it('rounds the corner to whole pixels, which is all Electron accepts', () => {
        const menu = { popup: vi.fn() };
        const window = { id: 3 };

        popupAppMenu(menu, window, 12.5, 39.25);

        expect(menu.popup).toHaveBeenCalledWith({ window, x: 13, y: 39 });
    });
});
