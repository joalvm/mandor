import { describe, expect, it, vi } from 'vitest';

import { installAppMenu, type AppMenuPort } from '../../src/menu/install-app-menu.js';

function spyPort() {
    const calls: (unknown[] | null)[] = [];
    const menu = { popup: vi.fn() };
    const port: AppMenuPort<typeof menu> = {
        buildFromTemplate: vi.fn(() => menu),
        setApplicationMenu: vi.fn((given) => {
            calls.push(given === null ? null : [given]);
        }),
    };

    return { menu, port };
}

describe('installing the application menu', () => {
    it('installs the menu as the application menu on macOS', () => {
        const { menu, port } = spyPort();

        const handle = installAppMenu(port, [{ label: 'Mandor Realtime' }], 'darwin');

        expect(port.buildFromTemplate).toHaveBeenCalledOnce();
        expect(port.setApplicationMenu).toHaveBeenCalledWith(menu);
        expect(handle).toBe(menu);
    });

    /**
     * Off macOS the menu lives inside the window, opened by the menu button: the application
     * menu stays null so the system builds none of its own behind our back.
     */
    it('installs nothing and keeps the menu for the popup elsewhere', () => {
        const { menu, port } = spyPort();

        const handle = installAppMenu(port, [{ label: 'Mandor Realtime' }], 'win32');

        expect(port.setApplicationMenu).toHaveBeenCalledWith(null);
        expect(handle).toBe(menu);
    });
});
