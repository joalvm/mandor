import type { MenuItemConstructorOptions } from 'electron';

/**
 * What installing and popping up a menu needs from Electron, named structurally so a plain
 * node test can stand in for `Menu`. The handle it answers with is the built menu itself.
 */
export type AppMenuPort = {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => OpenedMenu;
    setApplicationMenu: (menu: OpenedMenu | null) => void;
};

/** The menu once built: it can open under a window, at given window coordinates. */
export type OpenedMenu = {
    popup: (options: { window?: unknown; x?: number; y?: number }) => void;
};

/**
 * macOS gets the menu where its users look for it, in the system menu bar. Every other
 * desktop system gets `null` as the application menu — the system would otherwise build one
 * of its own behind the app's back — and the same template stays in the handle for the menu
 * button to open as a popup.
 */
export function installAppMenu(
    port: AppMenuPort,
    template: MenuItemConstructorOptions[],
    platform: NodeJS.Platform,
): OpenedMenu {
    const menu = port.buildFromTemplate(template);

    if (platform === 'darwin') {
        port.setApplicationMenu(menu);

        return menu;
    }

    port.setApplicationMenu(null);

    return menu;
}
