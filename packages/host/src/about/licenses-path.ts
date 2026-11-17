import { join } from 'node:path';

type LicensesPlace = {
    /** Where the app runs from while it is developed: the folder of the app, two below the repo. */
    appPath: string;
    packaged: boolean;
    resourcesPath: string;
};

/**
 * What shows the licenses of the install. The installer copies them to `licenses/` beside the
 * app; unpackaged there is no such folder, so the licence of the repo stands in for it. The
 * path is made here, from where the process runs: the window never names one.
 */
export function licensesPath({ appPath, packaged, resourcesPath }: LicensesPlace): string {
    return packaged ? join(resourcesPath, 'licenses') : join(appPath, '..', '..', 'LICENSE');
}
