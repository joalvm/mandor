import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openLocalOrigin } from '../../src/origin/open-local-origin.js';
import { closeOriginRuntime } from '../../src/origin/origin-runtime.js';
import { startHost, type StartHostConfig } from '../../src/runtime/start-host.js';
import { isInstallRun } from '../../src/update/install-update.js';
import { createWindow } from '../../src/window/create-window.js';
import { focusWindow } from '../../src/window/focus-window.js';

const doubles = vi.hoisted(() => {
    const calls: string[] = [];
    const listeners = new Map<string, () => void>();
    const logger = { log: vi.fn() };
    const undo = {
        window: vi.fn(),
        handlers: vi.fn(),
        renderer: vi.fn(),
        scripts: vi.fn(),
    };
    const created = { window: { id: 'window' }, dispose: undo.window };

    return {
        calls,
        listeners,
        logger,
        undo,
        created,
        app: {
            commandLine: {},
            getPath: vi.fn(() => '/data'),
            on: vi.fn((name: string, listener: () => void) => {
                listeners.set(name, listener);
            }),
            quit: vi.fn(),
            requestSingleInstanceLock: vi.fn(() => true),
            whenReady: vi.fn(() => {
                calls.push('ready');

                return Promise.resolve();
            }),
        },
    };
});

vi.mock('electron', () => ({ app: doubles.app, ipcMain: { id: 'ipc' }, protocol: { id: 'p' } }));
vi.mock('../../src/about/electron-about-deps.js', () => ({ electronAboutDeps: vi.fn(() => ({})) }));
vi.mock('../../src/window/electron-appearance-deps.js', () => ({
    electronAppearanceDeps: vi.fn(() => ({})),
}));
vi.mock('../../src/ipc/trusted-sender-ipc.js', () => ({
    trustedSenderIpc: vi.fn(() => 'trusted'),
}));
vi.mock('../../src/log/create-logger.js', () => ({ createLogger: vi.fn(() => doubles.logger) }));
vi.mock('../../src/notice/raise-notice.js', () => ({ createNoticeOutbox: vi.fn(() => ({})) }));
vi.mock('../../src/origin/open-local-origin.js', () => ({
    openLocalOrigin: vi.fn(() => {
        doubles.calls.push('origin');

        return Promise.resolve();
    }),
}));
vi.mock('../../src/origin/origin-runtime.js', () => ({
    bindRuntimeWindow: vi.fn(() => vi.fn()),
    closeOriginRuntime: vi.fn(),
    requestSync: vi.fn(),
}));
vi.mock('../../src/origin/system-keychain.js', () => ({
    noticeMissingKeychain: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/script/scripts.handlers.js', () => ({
    openScripts: vi.fn(() => Promise.resolve({ close: doubles.undo.scripts })),
}));
vi.mock('../../src/runtime/hold-quit-for-session.js', () => ({ holdQuitForSession: vi.fn() }));
vi.mock('../../src/runtime/register-handlers.js', () => ({
    registerHandlers: vi.fn(() => [doubles.undo.handlers]),
}));
vi.mock('../../src/runtime/register-renderer-protocol.js', () => ({
    registerRendererProtocol: vi.fn(() => doubles.undo.renderer),
}));
vi.mock('../../src/devtools/install-devtools.js', () => ({
    installDevTools: vi.fn(() => vi.fn()),
}));
vi.mock('../../src/dialogs/modal-dialog.js', () => ({ bindDialogParent: vi.fn(() => vi.fn()) }));
vi.mock('../../src/menu/build-app-menu.js', () => ({ buildAppMenu: vi.fn(() => []) }));
vi.mock('../../src/menu/electron-menu-port.js', () => ({ electronMenuPort: vi.fn(() => ({})) }));
vi.mock('../../src/menu/install-app-menu.js', () => ({
    installAppMenu: vi.fn(() => {
        doubles.calls.push('menu');

        return {};
    }),
}));
vi.mock('../../src/window/csp-nonce.js', () => ({ createCspNonce: vi.fn(() => 'nonce') }));
vi.mock('../../src/window/create-window.js', () => ({
    createWindow: vi.fn(() => {
        doubles.calls.push('window');

        return doubles.created;
    }),
}));
vi.mock('../../src/window/focus-events.js', () => ({ watchFocusEvents: vi.fn() }));
vi.mock('../../src/window/focus-window.js', () => ({ focusWindow: vi.fn() }));
vi.mock('../../src/window/native-ask.js', () => ({ nativeAsk: vi.fn(() => vi.fn()) }));
vi.mock('../../src/window/renderer-protocol.js', () => ({
    createRendererProtocol: vi.fn(() => ({ entryUrl: 'mandor://app/index.html' })),
    registerRendererScheme: vi.fn(() => {
        doubles.calls.push('scheme');
    }),
}));
vi.mock('../../src/window/window-faults.js', () => ({ watchWindowFaults: vi.fn(() => vi.fn()) }));
vi.mock('../../src/runtime/chromium-limits.js', () => ({
    applyChromiumLimits: vi.fn(() => {
        doubles.calls.push('limits');
    }),
}));
vi.mock('../../src/runtime/process-faults.js', () => ({
    watchProcessFaults: vi.fn(() => vi.fn()),
}));
vi.mock('../../src/update/electron-update-deps.js', () => ({
    electronUpdateDeps: vi.fn(() => ({ installOnQuit: vi.fn() })),
}));
vi.mock('../../src/update/install-update.js', () => ({ isInstallRun: vi.fn(() => false) }));

// The app answers only for what it decides; the rest of the config is never read by the start.
const CONFIG = {
    appId: 'com.mandor.sync',
    homepage: 'https://example.test',
    icon: 'icon.png',
    kind: 'sync',
    mainDir: '/app/out/main',
    productName: 'Mandor Request',
    title: 'Mandor Request',
} as unknown as StartHostConfig;

const PLATFORM = process.platform;

function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value });
}

function emit(name: string): void {
    doubles.listeners.get(name)?.();
}

beforeEach(() => {
    vi.clearAllMocks();
    doubles.calls.length = 0;
    doubles.listeners.clear();
    doubles.app.requestSingleInstanceLock.mockReturnValue(true);
    vi.mocked(isInstallRun).mockReturnValue(false);
});

afterEach(() => {
    setPlatform(PLATFORM);
});

describe('bringing an app up', () => {
    /** Electron reads the switches and builds its own menu while it boots: late is ignored. */
    it('sets the limits, the scheme and the menu before it waits for the app to be ready', async () => {
        await startHost(CONFIG);

        expect(doubles.calls.slice(0, 5)).toEqual(['limits', 'scheme', 'menu', 'ready', 'origin']);
    });

    it('opens the local origin and then the window, once the app is ready', async () => {
        await startHost(CONFIG);

        expect(doubles.calls.slice(3)).toEqual(['ready', 'origin', 'window']);
        expect(openLocalOrigin).toHaveBeenCalledWith('sync', '/data', doubles.logger, 'en');
        expect(createWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                appId: 'com.mandor.sync',
                entryUrl: 'mandor://app/index.html',
                mode: 'production',
            }),
            'nonce',
        );
        expect(doubles.logger.log).toHaveBeenCalledWith('info', 'the host is up for sync');
    });

    it('quits at once when another copy of the app already holds the lock', async () => {
        doubles.app.requestSingleInstanceLock.mockReturnValue(false);

        await startHost(CONFIG);

        expect(doubles.app.quit).toHaveBeenCalledTimes(1);
        expect(doubles.app.whenReady).not.toHaveBeenCalled();
        expect(createWindow).not.toHaveBeenCalled();
    });

    it('quits at once when it is the run that ends an install, without asking for the lock', async () => {
        vi.mocked(isInstallRun).mockReturnValue(true);

        await startHost(CONFIG);

        expect(doubles.app.quit).toHaveBeenCalledTimes(1);
        expect(doubles.app.requestSingleInstanceLock).not.toHaveBeenCalled();
        expect(openLocalOrigin).not.toHaveBeenCalled();
    });
});

describe('what the app does as the system asks', () => {
    it('brings the window forward when a second copy is started', async () => {
        await startHost(CONFIG);
        emit('second-instance');

        expect(focusWindow).toHaveBeenCalledWith(doubles.created.window);
    });

    it('has nothing to bring forward when no window is open', async () => {
        await startHost(CONFIG);
        emit('window-all-closed');
        emit('second-instance');

        expect(focusWindow).not.toHaveBeenCalled();
    });

    it('ends the window, its handlers and the origin runtime when the last window closes', async () => {
        await startHost(CONFIG);
        emit('window-all-closed');

        expect(doubles.undo.window).toHaveBeenCalledTimes(1);
        expect(doubles.undo.handlers).toHaveBeenCalledTimes(1);
        expect(closeOriginRuntime).toHaveBeenCalledTimes(1);
        expect(doubles.logger.log).toHaveBeenCalledWith(
            'info',
            'the host released its window, its handlers and its sockets',
        );
    });

    it('quits when the last window closes, but on macOS', async () => {
        await startHost(CONFIG);
        emit('window-all-closed');

        expect(doubles.app.quit).toHaveBeenCalledTimes(1);

        doubles.app.quit.mockClear();
        setPlatform('darwin');
        emit('window-all-closed');

        expect(doubles.app.quit).not.toHaveBeenCalled();
    });

    it('opens a window again from the dock', async () => {
        await startHost(CONFIG);
        emit('window-all-closed');
        emit('activate');
        await vi.waitFor(() => {
            expect(createWindow).toHaveBeenCalledTimes(2);
        });
    });

    it('writes down a window that could not open again instead of failing loose', async () => {
        await startHost(CONFIG);
        emit('window-all-closed');
        vi.mocked(openLocalOrigin).mockRejectedValueOnce(new Error('disk is gone'));
        emit('activate');
        await vi.waitFor(() => {
            expect(doubles.logger.log).toHaveBeenCalledWith(
                'error',
                'the window could not open again: Error: disk is gone',
            );
        });
    });

    it('ends the window, the workers of scripts and the protocol once when the app quits', async () => {
        await startHost(CONFIG);
        emit('will-quit');
        emit('will-quit');

        expect(doubles.undo.window).toHaveBeenCalledTimes(1);
        expect(doubles.undo.scripts).toHaveBeenCalledTimes(1);
        expect(doubles.undo.renderer).toHaveBeenCalledTimes(1);
    });
});
