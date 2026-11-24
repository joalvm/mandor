import type { MenuItemConstructorOptions } from 'electron';

/**
 * What installing a menu needs from Electron, over the menu it builds: `Menu` in the app, a
 * plain double in a node test. The handle it answers with is the built menu itself.
 */
export type AppMenuPort<M> = {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => M;
    setApplicationMenu: (menu: M | null) => void;
};

/**
 * The menu once built: it opens under a window, at given window coordinates. The window is the
 * one the handlers resolve from the message: a `BrowserWindow` in the app, a double in a test.
 */
export type OpenedMenu<W> = {
    popup: (options: { window: W; x: number; y: number }) => void;
};

/**
 * macOS gets the menu where its users look for it, in the system menu bar. Every other
 * desktop system gets `null` as the application menu — the system would otherwise build one
 * of its own behind the app's back — and the same template stays in the handle for the menu
 * button to open as a popup.
 */
export function installAppMenu<M>(
    port: AppMenuPort<M>,
    template: MenuItemConstructorOptions[],
    platform: NodeJS.Platform,
): M {
    const menu = port.buildFromTemplate(template);

    if (platform === 'darwin') {
        port.setApplicationMenu(menu);

        return menu;
    }

    port.setApplicationMenu(null);

    return menu;
}
