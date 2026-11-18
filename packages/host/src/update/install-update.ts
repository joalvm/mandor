import type { UpdatePort } from './update-port.js';

/**
 * The person pressed restart: what is written reaches the disk first, and then the app leaves,
 * installs and opens again. The order is the point, because the installer replaces the files of
 * the app under a process that would still be writing.
 */
export async function installNow(port: UpdatePort, settle: () => Promise<void>): Promise<void> {
    await settle();
    port.quitAndInstall(true, true);
}

/**
 * The app is closing, and a version waits downloaded: its installer starts on the way out and the
 * app does not open again. This is ours and not the library's `autoInstallOnAppQuit`, which hangs
 * off events our quit never emits.
 */
export function installOnQuit(port: UpdatePort): void {
    if (port.hasDownloaded()) {
        port.quitAndInstall(true, false);
    }
}

/**
 * The updater of an AppImage swaps the file on quit and then runs the new one with this variable
 * set, waiting for it to end before the old app can go: that run is the install, and nothing is
 * opened in it.
 */
const EXIT_AFTER_INSTALL = 'APPIMAGE_EXIT_AFTER_INSTALL';

/** Whether this start is only the end of an install, and the app leaves at once. */
export function isInstallRun(env: Readonly<Record<string, string | undefined>>): boolean {
    return env[EXIT_AFTER_INSTALL] === 'true';
}
