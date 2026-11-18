import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { createElectronUpdaterPort } from '../../src/update/electron-updater-port.js';
import type { UpdatePortEvent } from '../../src/update/update-port.js';

const { library, updater } = await vi.hoisted(async () => {
    const { EventEmitter } = await import('node:events');

    return {
        library: { count: 0, failing: false },
        updater: Object.assign(new EventEmitter(), {
            allowDowngrade: true,
            autoDownload: true,
            autoInstallOnAppQuit: true,
            channel: null as string | null,
            checkForUpdates: vi.fn(),
            downloadUpdate: vi.fn(),
            logger: {} as Record<'info' | 'warn' | 'error', (message: unknown) => void>,
            quitAndInstall: vi.fn(),
        }),
    };
});

// The real library is CommonJS: Node's ESM loader gives it only as the default export. Its
// `autoUpdater` is a getter that builds the updater, so reading it is what loading costs.
vi.mock('electron-updater', () => ({
    default: {
        get autoUpdater() {
            if (library.failing) {
                throw new Error('Cannot find module');
            }

            library.count += 1;

            return updater;
        },
    },
}));

const logged: [string, string][] = [];
const logger: Logger = {
    log: (level, message) => {
        logged.push([level, message]);
    },
    flush: () => Promise.resolve(),
};

function portWithListener() {
    const events: UpdatePortEvent[] = [];
    const port = createElectronUpdaterPort(logger, '0.1.0');
    const stop = port.onEvent((event) => events.push(event));

    return { events, port, stop };
}

/** A port whose library is already there: one look loaded it, and that look is forgotten. */
async function loadedPort() {
    const listened = portWithListener();

    await listened.port.checkForUpdates();
    updater.checkForUpdates.mockClear();
    listened.events.length = 0;
    logged.length = 0;

    return listened;
}

beforeEach(() => {
    updater.removeAllListeners();
    updater.checkForUpdates.mockReset().mockResolvedValue(null);
    updater.downloadUpdate.mockReset().mockResolvedValue([]);
    updater.quitAndInstall.mockReset();
    library.count = 0;
    library.failing = false;
    logged.length = 0;
});

describe('the port over electron-updater', () => {
    it('leaves the library unloaded until the first look, and loads it once', async () => {
        const { port } = portWithListener();

        port.setChannel('beta');
        port.setAutoDownload(true);
        port.quitAndInstall(true, false);

        expect(library.count).toBe(0);
        expect(updater.quitAndInstall).not.toHaveBeenCalled();

        await Promise.all([port.checkForUpdates(), port.checkForUpdates()]);
        await port.downloadUpdate();

        expect(library.count).toBe(1);
        expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
        expect(updater.downloadUpdate).toHaveBeenCalledTimes(1);
    });

    it('takes the downloading and the installing away from the library', async () => {
        await loadedPort();

        expect(updater.autoDownload).toBe(false);
        expect(updater.autoInstallOnAppQuit).toBe(false);
    });

    it('writes what the library says in the log of the host', async () => {
        await loadedPort();
        const written = updater.logger;

        written.info('a');
        written.warn('b');
        written.error('c');

        expect(logged).toEqual([
            ['info', 'updater: a'],
            ['warn', 'updater: b'],
            ['error', 'updater: c'],
        ]);
    });

    it('forwards the events of the library in the words of the port', async () => {
        const { events } = await loadedPort();
        const info = { version: '0.2.0', releaseDate: '2026-10-01', releaseNotes: 'Notas' };

        updater.emit('checking-for-update');
        updater.emit('update-available', info);
        updater.emit('download-progress', { percent: 12.5 });
        updater.emit('update-downloaded', info);
        updater.emit('update-not-available');

        const next = { version: '0.2.0', notes: 'Notas', date: '2026-10-01' };

        expect(events).toEqual([
            { type: 'checking-for-update' },
            { type: 'update-available', info: next },
            { type: 'download-progress', percent: 12.5 },
            { type: 'update-downloaded', info: next },
            { type: 'update-not-available' },
        ]);
    });

    it('tells a road that does not reach the feed apart from any other failure', async () => {
        const { events } = await loadedPort();

        updater.emit('error', new Error('getaddrinfo ENOTFOUND github.com'));
        updater.emit('error', new Error('net::ERR_INTERNET_DISCONNECTED'));
        updater.emit('error', new Error('boom'));
        updater.emit('error', 'not an error');

        expect(events).toEqual([
            { type: 'error', code: 'request-unreachable' },
            { type: 'error', code: 'request-unreachable' },
            { type: 'error', code: 'unknown' },
            { type: 'error', code: 'unknown' },
        ]);
    });

    it('never tells a download it refused as a road that does not reach the feed', async () => {
        const { events } = await loadedPort();
        const refused = Object.assign(new Error('sha512 checksum mismatch'), {
            code: 'ERR_UPDATER_INVALID_SIGNATURE',
        });

        updater.emit('error', refused);

        expect(events).toEqual([{ type: 'error', code: 'unknown' }]);
    });

    it('tells a library that does not load as a failed look, and tries again on the next', async () => {
        const { events, port } = portWithListener();

        library.failing = true;
        await port.checkForUpdates();

        expect(events).toEqual([{ type: 'error', code: 'unknown' }]);
        expect(logged).toEqual([['error', 'updater: Error: Cannot find module']]);
        expect(updater.checkForUpdates).not.toHaveBeenCalled();

        library.failing = false;
        await port.checkForUpdates();

        expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('stops telling a listener once its stop is called', async () => {
        const { events, stop } = await loadedPort();

        stop();
        updater.emit('checking-for-update');

        expect(events).toEqual([]);
    });

    it('hands a channel chosen before the load over on loading', async () => {
        const { port } = portWithListener();

        port.setChannel('beta');
        await port.checkForUpdates();

        expect([updater.channel, updater.allowDowngrade]).toEqual(['beta', false]);
    });

    it('follows a channel and never lets it take the app to an older version', async () => {
        const { port } = await loadedPort();

        port.setChannel('beta');

        expect([updater.channel, updater.allowDowngrade]).toEqual(['beta', false]);

        updater.allowDowngrade = true;
        port.setChannel('stable');

        expect([updater.channel, updater.allowDowngrade]).toEqual(['latest', false]);
    });

    it('hands the download to the library when the schedule says so, before and after it loads', async () => {
        const { port } = portWithListener();

        port.setAutoDownload(true);
        await port.checkForUpdates();

        expect(updater.autoDownload).toBe(true);

        port.setAutoDownload(false);

        expect(updater.autoDownload).toBe(false);
    });

    it('leaves a failed look to the event the library raised, and does not throw it again', async () => {
        const { port } = await loadedPort();

        updater.checkForUpdates.mockRejectedValue(new Error('down'));
        updater.downloadUpdate.mockRejectedValue(new Error('down'));

        await expect(port.checkForUpdates()).resolves.toBeUndefined();
        await expect(port.downloadUpdate()).resolves.toBeUndefined();
    });

    it('knows that a version was downloaded once the library says so', async () => {
        const { port } = await loadedPort();

        expect(port.hasDownloaded()).toBe(false);

        updater.emit('update-downloaded', { version: '0.2.0' });

        expect(port.hasDownloaded()).toBe(true);
    });

    it('installs through the library with the two flags it was given', async () => {
        const { port } = await loadedPort();

        port.quitAndInstall(true, false);

        expect(updater.quitAndInstall).toHaveBeenCalledWith(true, false);
        expect(port.currentVersion).toBe('0.1.0');
    });
});
