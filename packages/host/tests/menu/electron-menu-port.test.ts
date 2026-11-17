import { beforeEach, describe, expect, it, vi } from 'vitest';

import { electronMenuPort } from '../../src/menu/electron-menu-port.js';

const { Menu } = vi.hoisted(() => ({
    Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
}));

vi.mock('electron', () => ({ Menu }));

beforeEach(() => {
    Menu.buildFromTemplate.mockReset();
    Menu.setApplicationMenu.mockReset();
});

describe("the port over Electron's own menu", () => {
    it('builds the template and hands back the built menu as the handle', () => {
        const built = { popup: vi.fn() };

        Menu.buildFromTemplate.mockReturnValue(built);

        const template = [{ label: 'File' }];
        const handle = electronMenuPort().buildFromTemplate(template);

        expect(Menu.buildFromTemplate).toHaveBeenCalledWith(template);
        expect(handle).toBe(built);
    });

    it('installs a menu and clears it with null through the same door', () => {
        const port = electronMenuPort();
        const menu = { popup: vi.fn() };

        port.setApplicationMenu(menu);
        port.setApplicationMenu(null);

        expect(Menu.setApplicationMenu).toHaveBeenNthCalledWith(1, menu);
        expect(Menu.setApplicationMenu).toHaveBeenNthCalledWith(2, null);
    });

    it('opens the built menu under a window at the corner the renderer measured', () => {
        const popup = vi.fn();

        Menu.buildFromTemplate.mockReturnValue({ popup });

        const menu = electronMenuPort().buildFromTemplate([]);
        const window = { id: 7 };

        menu.popup({ window, x: 4, y: 8 });

        expect(popup).toHaveBeenCalledWith({ window, x: 4, y: 8 });
    });
});
