import { app, nativeImage, shell } from 'electron';

import type { AboutHandlerDeps } from './about.handlers.js';
import { licensesPath } from './licenses-path.js';

/** The width the About draws the mark at, twice over, so a dense screen shows it sharp. */
const ICON_WIDTH = 128;

/** The mark of the app as the window can draw it, or nothing when the install carries none. */
function iconOf(path: string | undefined): string {
    if (path === undefined) {
        return '';
    }

    const image = nativeImage.createFromPath(path);

    return image.isEmpty() ? '' : image.resize({ quality: 'best', width: ICON_WIDTH }).toDataURL();
}

/**
 * `registerAboutHandlers` over the real app: its version, its mark, its runtimes, the system it
 * runs on and the file manager of that system.
 */
export function electronAboutDeps(productName: string, iconPath?: string): AboutHandlerDeps {
    return {
        about: () => ({
            arch: process.arch,
            chrome: process.versions.chrome,
            electron: process.versions.electron,
            icon: iconOf(iconPath),
            name: productName,
            node: process.versions.node,
            platform: process.platform,
            system: process.getSystemVersion(),
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
