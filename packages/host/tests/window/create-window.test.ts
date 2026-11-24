import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createWindow, type CreateWindowOptions } from '../../src/window/create-window.js';

/** What the window asks before it leaves its document: the event to cancel it, and where to. */
type Navigation = (event: { preventDefault: () => void }, url: string) => void;

type WindowDouble = {
    options: Record<string, unknown>;
    once: Record<string, () => void>;
    contents: Record<string, Navigation>;
    openHandler: ((details: { url: string }) => { action: string }) | null;
    show: Mock<() => void>;
    loadURL: Mock<(url: string) => Promise<void>>;
};

const electron = vi.hoisted(() => {
    const windows: WindowDouble[] = [];

    class BrowserWindow {
        readonly double: WindowDouble;
        readonly webContents: object;

        constructor(options: Record<string, unknown>) {
            const double: WindowDouble = {
                options,
                once: {},
                contents: {},
                openHandler: null,
                show: vi.fn(),
                loadURL: vi.fn(() => Promise.resolve()),
            };

            this.double = double;
            this.webContents = {
                setWindowOpenHandler: (handler: WindowDouble['openHandler']) => {
                    double.openHandler = handler;
                },
                on: (event: string, listener: Navigation) => {
                    double.contents[event] = listener;
                },
            };
            windows.push(double);
        }

        once(event: string, listener: () => void): void {
            this.double.once[event] = listener;
        }

        show(): void {
            this.double.show();
        }

        loadURL(url: string): Promise<void> {
            return this.double.loadURL(url);
        }
    }

    return {
        windows,
        BrowserWindow,
        app: { setAppUserModelId: vi.fn() },
        shell: { openExternal: vi.fn() },
        webRequest: { onHeadersReceived: vi.fn() },
        permissions: { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
    };
});

vi.mock('electron', () => ({
    app: electron.app,
    BrowserWindow: electron.BrowserWindow,
    shell: electron.shell,
    session: {
        defaultSession: { webRequest: electron.webRequest, ...electron.permissions },
    },
}));

const ENTRY = 'mandor://app/index.html';

const OPTIONS: CreateWindowOptions = {
    appId: 'com.mandor.async',
    title: 'Mandor Realtime',
    preload: '/out/preload/index.mjs',
    entryUrl: ENTRY,
    mode: 'production',
};

beforeEach(() => {
    electron.windows.length = 0;
    vi.clearAllMocks();
});

function opened(options: CreateWindowOptions = OPTIONS): WindowDouble {
    createWindow(options, 'bm9uY2U');

    const window = electron.windows.at(-1);

    if (window === undefined) {
        throw new Error('no window was made');
    }

    return window;
}

function navigationOf(window: WindowDouble): Navigation {
    const listener = window.contents['will-navigate'];

    if (listener === undefined) {
        throw new Error('the window listens to no navigation');
    }

    return listener;
}

describe('opening the window of an app', () => {
    it('tells the system which app it is before anything else', () => {
        opened();

        expect(electron.app.setAppUserModelId).toHaveBeenCalledWith('com.mandor.async');
    });

    it('turns every privilege of the renderer off', () => {
        const preferences = opened().options['webPreferences'];

        expect(preferences).toMatchObject({
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            preload: '/out/preload/index.mjs',
            spellcheck: false,
            webgl: false,
        });
    });

    it('is born hidden, with the title the app chose, and loads its entry', () => {
        const window = opened();

        expect(window.options['show']).toBe(false);
        expect(window.options['title']).toBe('Mandor Realtime');
        expect(window.loadURL).toHaveBeenCalledWith(ENTRY);
    });

    it('asks for no icon at all when the app has none', () => {
        expect('icon' in opened().options).toBe(false);
    });

    it('passes the icon when the app has one', () => {
        expect(opened({ ...OPTIONS, icon: '/art/icon.png' }).options['icon']).toBe('/art/icon.png');
    });

    it('shows the window once it is painted, and says so', () => {
        const onShown = vi.fn();
        const window = opened({ ...OPTIONS, onShown });

        expect(window.show).not.toHaveBeenCalled();

        window.once['ready-to-show']?.();

        expect(window.show).toHaveBeenCalledTimes(1);
        expect(onShown).toHaveBeenCalledTimes(1);
    });

    it('shows the window when nobody asked to be told', () => {
        const window = opened();

        window.once['ready-to-show']?.();

        expect(window.show).toHaveBeenCalledTimes(1);
    });
});

describe('what the window refuses to do', () => {
    it('never opens a second window, and sends an https link to the browser of the user', () => {
        const window = opened();

        const answer = window.openHandler?.({ url: 'https://example.com/docs' });

        expect(answer).toEqual({ action: 'deny' });
        expect(electron.shell.openExternal).toHaveBeenCalledWith('https://example.com/docs');
    });

    it('denies a link that is not one to follow, and opens nothing', () => {
        const window = opened();

        expect(window.openHandler?.({ url: 'file:///etc/passwd' })).toEqual({ action: 'deny' });
        expect(electron.shell.openExternal).not.toHaveBeenCalled();
    });

    it('blocks a navigation that leaves the origin of the app', () => {
        const preventDefault = vi.fn();
        const window = opened();

        navigationOf(window)({ preventDefault }, 'https://evil.example/');

        expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it('lets the app navigate inside its own document', () => {
        const preventDefault = vi.fn();
        const window = opened();

        navigationOf(window)({ preventDefault }, ENTRY);

        expect(preventDefault).not.toHaveBeenCalled();
    });
});

describe('what the window leaves on the session', () => {
    it('installs the policy and the permission handlers, and removes them on dispose', () => {
        const { dispose } = createWindow(OPTIONS, 'bm9uY2U');

        expect(electron.webRequest.onHeadersReceived).toHaveBeenLastCalledWith(
            expect.any(Function),
        );
        expect(electron.permissions.setPermissionRequestHandler).toHaveBeenLastCalledWith(
            expect.any(Function),
        );

        dispose();

        expect(electron.webRequest.onHeadersReceived).toHaveBeenLastCalledWith(null);
        expect(electron.permissions.setPermissionRequestHandler).toHaveBeenLastCalledWith(null);
        expect(electron.permissions.setPermissionCheckHandler).toHaveBeenLastCalledWith(null);
    });
});
