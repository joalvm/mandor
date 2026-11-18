import type { ErrorCode, UpdateChannel, UpdateNext } from '@mandor/ipc';

/** What the updater says as it works, already in the words of the window and none of the library. */
export type UpdatePortEvent =
    | { type: 'checking-for-update' }
    | { type: 'update-available'; info: UpdateNext }
    | { type: 'update-not-available' }
    | { type: 'download-progress'; percent: number }
    | { type: 'update-downloaded'; info: UpdateNext }
    | { type: 'error'; code: ErrorCode };

/**
 * Everything main asks of whatever finds and installs updates, so the state machine and the
 * handlers are tested without Electron and the library sits behind one door.
 */
export type UpdatePort = {
    /** The version that runs. */
    currentVersion: string;
    /** Looks for a version. A failure is told as an `error` event, never thrown. */
    checkForUpdates: () => Promise<void>;
    /** Downloads the version found. A failure is told as an `error` event, never thrown. */
    downloadUpdate: () => Promise<void>;
    /** Whether a version is downloaded and waits to be installed. */
    hasDownloaded: () => boolean;
    /** Leaves the app and installs the version downloaded. `forceRunAfter` opens it again. */
    quitAndInstall: (silent: boolean, forceRunAfter: boolean) => void;
    /** Which feed to follow. It never takes the app to a version older than the one it runs. */
    setChannel: (channel: UpdateChannel) => void;
    /** Whether a version found is downloaded without waiting to be asked. */
    setAutoDownload: (on: boolean) => void;
    /** Hears every event of the updater, and gives back the way to stop. */
    onEvent: (handler: (event: UpdatePortEvent) => void) => () => void;
};

/**
 * The port of an install that cannot update: it finds nothing and installs nothing, and it never
 * touches the library, which needs a packaged app with a feed written inside.
 */
export function inertUpdatePort(currentVersion: string): UpdatePort {
    return {
        currentVersion,
        checkForUpdates: () => Promise.resolve(),
        downloadUpdate: () => Promise.resolve(),
        hasDownloaded: () => false,
        quitAndInstall: () => undefined,
        setChannel: () => undefined,
        setAutoDownload: () => undefined,
        onEvent: () => () => undefined,
    };
}
