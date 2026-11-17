import { afterEach, describe, expect, it, vi } from 'vitest';

import { installDevTools } from '../../src/devtools/install-devtools.js';
import type { Logger } from '../../src/log/create-logger.js';

const { app, session } = vi.hoisted(() => ({
    app: { isPackaged: false },
    session: { defaultSession: { extensions: { loadExtension: vi.fn() } } },
}));

vi.mock('electron', () => ({ app, session }));

function fakeWindow() {
    const listeners = new Map<string, () => void>();
    const webContents = {
        on: vi.fn((event: string, listener: () => void) => {
            listeners.set(event, listener);
        }),
        off: vi.fn((event: string) => {
            listeners.delete(event);
        }),
        toggleDevTools: vi.fn(),
    };

    return { listeners, webContents };
}

function logger(): Logger {
    return { flush: vi.fn(), log: vi.fn() };
}

afterEach(() => {
    delete process.env['MANDOR_REACT_DEVTOOLS'];
    vi.clearAllMocks();
});

describe('installing what development adds to the window', () => {
    it('loads the extension it finds on the machine, with file access', () => {
        process.env['MANDOR_REACT_DEVTOOLS'] = 'C:/ext/react-devtools';
        session.defaultSession.extensions.loadExtension.mockResolvedValue({ id: 'react' });

        installDevTools(fakeWindow() as never, logger());

        expect(session.defaultSession.extensions.loadExtension).toHaveBeenCalledWith(
            'C:/ext/react-devtools',
            { allowFileAccess: true },
        );
    });

    it('never reads the extension variable in a packaged build', () => {
        app.isPackaged = true;
        process.env['MANDOR_REACT_DEVTOOLS'] = 'C:/ext/react-devtools';

        installDevTools(fakeWindow() as never, logger());

        expect(session.defaultSession.extensions.loadExtension).not.toHaveBeenCalled();
        app.isPackaged = false;
    });

    it('carries on when the extension refuses to load', async () => {
        process.env['MANDOR_REACT_DEVTOOLS'] = 'C:/ext/react-devtools';
        session.defaultSession.extensions.loadExtension.mockRejectedValue(new Error('gone'));
        const log = logger();

        const dispose = installDevTools(fakeWindow() as never, log);

        await vi.waitFor(() => {
            expect(log.log).toHaveBeenCalledWith('warn', expect.stringContaining('gone'));
        });
        expect(typeof dispose).toBe('function');
    });

    it('hands back the disposer that stops watching for the shortcut', () => {
        const { listeners, webContents } = fakeWindow();

        const dispose = installDevTools({ webContents } as never, logger());

        expect(listeners.has('before-input-event')).toBe(true);

        dispose();

        expect(listeners.has('before-input-event')).toBe(false);
    });
});
