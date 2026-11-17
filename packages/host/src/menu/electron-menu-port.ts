import { Menu } from 'electron';

import type { AppMenuPort, OpenedMenu } from './install-app-menu.js';

/**
 * The port of Electron's own `Menu`, and the only place that knows the real object. The casts
 * stay here because Electron's `popup` takes a looser shape than the one the bridge sends:
 * the popup channel always names a window and a corner, so the looser signature is the one
 * the rest of the code sees.
 */
export function electronMenuPort(): AppMenuPort {
    return {
        buildFromTemplate: (template) => Menu.buildFromTemplate(template) as OpenedMenu,
        setApplicationMenu: (menu) => {
            Menu.setApplicationMenu(menu as unknown as Menu | null);
        },
    };
}
