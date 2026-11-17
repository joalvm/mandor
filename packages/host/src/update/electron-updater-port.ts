import type { ErrorCode, UpdateChannel, UpdateNext } from '@mandor/ipc';
import type { AppUpdater, UpdateInfo } from 'electron-updater';

import type { Logger } from '../log/create-logger.js';
import { releaseNotesOf } from './update-machine.js';
import type { UpdatePort, UpdatePortEvent } from './update-port.js';

/**
 * What a machine with no road to the feed throws, which is a state of the world and not a bug:
 * the system's codes, and Chromium's `net::ERR_…` through Electron's network. A bare `ERR_` would
 * also take the library's own codes (`ERR_UPDATER_INVALID_SIGNATURE`), a download it refused.
 */
const UNREACHABLE = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|net::ERR_/;

/** The channel each choice reads in the feed: stable is what the library calls `latest`. */
const FEED_CHANNELS: Readonly<Record<UpdateChannel, string>> = { beta: 'beta', stable: 'latest' };

function codeOf(error: unknown): ErrorCode {
    const text =
        error instanceof Error ? `${error.message} ${String(Reflect.get(error, 'code'))}` : '';

    return UNREACHABLE.test(text) ? 'request-unreachable' : 'unknown';
}

function infoOf(info: UpdateInfo): UpdateNext {
    return {
        version: info.version,
        notes: releaseNotesOf(info.releaseNotes),
        date: info.releaseDate,
    };
}

/** The events of the library that the port tells, with the shape of each listener. */
type Listeners = {
    'checking-for-update': () => void;
    'update-not-available': () => void;
    'update-available': (info: UpdateInfo) => void;
    'update-downloaded': (info: UpdateInfo) => void;
    'download-progress': (progress: { percent: number }) => void;
    error: (error: unknown) => void;
};

const EVENT_NAMES = [
    'checking-for-update',
    'update-not-available',
    'update-available',
    'update-downloaded',
    'download-progress',
    'error',
] as const;

/** Each event of the library, as the event of the port it becomes. */
function translations(tell: (event: UpdatePortEvent) => void): Listeners {
    return {
        'checking-for-update': () => {
            tell({ type: 'checking-for-update' });
        },
        'update-not-available': () => {
            tell({ type: 'update-not-available' });
        },
        'update-available': (info) => {
            tell({ type: 'update-available', info: infoOf(info) });
        },
        'update-downloaded': (info) => {
            tell({ type: 'update-downloaded', info: infoOf(info) });
        },
        'download-progress': (progress) => {
            tell({ type: 'download-progress', percent: progress.percent });
        },
        error: (error) => {
            tell({ type: 'error', code: codeOf(error) });
        },
    };
}

/** What the schedule chose, kept until the library is there to take it. */
type Choices = { autoDownload: boolean; channel: string | undefined };

/**
 * The updater the library builds, set to do nothing by itself: it downloads when the schedule says
 * so and installs when the person does, because its own install on quit hangs off events our quit
 * never emits. What it says goes to the log of the host.
 */
function prepared(autoUpdater: AppUpdater, logger: Logger): AppUpdater {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = {
        info: (message) => {
            logger.log('info', `updater: ${String(message)}`);
        },
        warn: (message) => {
            logger.log('warn', `updater: ${String(message)}`);
        },
        error: (message) => {
            logger.log('error', `updater: ${String(message)}`);
        },
    };

    return autoUpdater;
}

function follow(autoUpdater: AppUpdater, choices: Choices): void {
    autoUpdater.autoDownload = choices.autoDownload;

    if (choices.channel !== undefined) {
        autoUpdater.channel = choices.channel;
        // Setting a channel allows a downgrade; leaving beta must wait for stable to catch up.
        autoUpdater.allowDowngrade = false;
    }
}

/**
 * The port over `electron-updater`, and the only file that names the library.
 *
 * The library is loaded on the first look and not with main: it costs a tenth of a second on a
 * warm start and seconds on a cold one, the first look waits for the window anyway, and an install
 * that only looks when asked may never need it. What is chosen before then is kept and handed
 * over on loading.
 */
export function createElectronUpdaterPort(logger: Logger, currentVersion: string): UpdatePort {
    const handlers = new Set<(event: UpdatePortEvent) => void>();
    const choices: Choices = { autoDownload: false, channel: undefined };
    let loading: Promise<AppUpdater> | undefined;
    let loaded: AppUpdater | undefined;
    let downloaded = false;

    function tell(event: UpdatePortEvent): void {
        if (event.type === 'update-downloaded') {
            downloaded = true;
        }

        for (const handler of handlers) {
            handler(event);
        }
    }

    function choose(change: Partial<Choices>): void {
        Object.assign(choices, change);

        if (loaded !== undefined) {
            follow(loaded, choices);
        }
    }

    // The library is CommonJS, so the built ESM main finds it only on the default export; and
    // `autoUpdater` is a getter that builds the updater from `app`, so it is read here, not on load.
    function load(): Promise<AppUpdater> {
        loading ??= import('electron-updater').then(({ default: library }) => {
            const autoUpdater = prepared(library.autoUpdater, logger);
            const listeners = translations(tell);

            for (const name of EVENT_NAMES) {
                autoUpdater.on(name, listeners[name]);
            }

            follow(autoUpdater, choices);
            loaded = autoUpdater;

            return autoUpdater;
        });

        return loading;
    }

    /** A library that does not load is a failed look, told like one; the next look tries again. */
    async function withLibrary(run: (autoUpdater: AppUpdater) => Promise<unknown>): Promise<void> {
        let autoUpdater: AppUpdater;

        try {
            autoUpdater = await load();
        } catch (error) {
            loading = undefined;
            logger.log('error', `updater: ${String(error)}`);
            tell({ type: 'error', code: 'unknown' });

            return;
        }

        // The library tells a failure as an `error` event and also rejects: the event is the report.
        await run(autoUpdater).catch(() => undefined);
    }

    return {
        currentVersion,
        checkForUpdates: () => withLibrary((autoUpdater) => autoUpdater.checkForUpdates()),
        downloadUpdate: () => withLibrary((autoUpdater) => autoUpdater.downloadUpdate()),
        hasDownloaded: () => downloaded,
        // Nothing was downloaded while the library was never loaded, so there is nothing to install.
        quitAndInstall: (silent, forceRunAfter) => {
            loaded?.quitAndInstall(silent, forceRunAfter);
        },
        setChannel: (channel) => {
            choose({ channel: FEED_CHANNELS[channel] });
        },
        setAutoDownload: (on) => {
            choose({ autoDownload: on });
        },
        onEvent: (handler) => {
            handlers.add(handler);

            return () => {
                handlers.delete(handler);
            };
        },
    };
}
