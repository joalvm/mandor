import { app, shell } from 'electron';

import type { AboutHandlerDeps } from './about.handlers.js';
import { licensesPath } from './licenses-path.js';

/** `registerAboutHandlers` over the real app: its version, its runtimes and the file manager of the system. */
export function electronAboutDeps(productName: string): AboutHandlerDeps {
    return {
        about: () => ({
            chrome: process.versions.chrome,
            electron: process.versions.electron,
            name: productName,
            node: process.versions.node,
            platform: process.platform,
            version: app.getVersion(),
        }),
        showLicenses: () =>
            shell.openPath(
                licensesPath({
                    appPath: app.getAppPath(),
                    packaged: app.isPackaged,
                    resourcesPath: process.resourcesPath,
                }),
            ),
    };
}
