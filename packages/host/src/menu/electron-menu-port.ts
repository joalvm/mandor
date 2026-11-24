import { Menu } from 'electron';

import type { AppMenuPort } from './install-app-menu.js';

/**
 * The menu Electron builds: the base class of the `Menu` the module exports, which is what its
 * own methods answer and take.
 */
type BuiltMenu = ReturnType<typeof Menu.buildFromTemplate>;

/** The port of Electron's own `Menu`, and the only place that knows the real object. */
export function electronMenuPort(): AppMenuPort<BuiltMenu> {
    return {
        buildFromTemplate: (template) => Menu.buildFromTemplate(template),
        setApplicationMenu: (menu) => {
            Menu.setApplicationMenu(menu);
        },
    };
}
