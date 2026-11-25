import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { createAppMenuHolder } from '../../src/menu/app-menu-holder.js';
import { registerHandlers, type AppHandlers } from '../../src/runtime/register-handlers.js';
import { createStartupTimeline } from '../../src/runtime/startup-timeline.js';
import { noScripts, silentNotices, spyIpc, spyWindow } from '../../src/testing/handler-harness.js';
import { inertUpdatePort } from '../../src/update/update-port.js';

// Nothing here opens a dialog or reads the keychain: the handlers are only registered.
vi.mock('electron', () => ({ BrowserWindow: {}, dialog: {}, safeStorage: {}, shell: {} }));

const ready = vi.fn();

function depsWith(handlers: readonly AppHandlers[]) {
    return {
        kind: 'async' as const,
        userDataDir: 'user-data',
        about: {
            about: () => ({
                arch: 'x64',
                chrome: '1',
                electron: '1',
                icon: '',
                name: 'Mandor',
                node: '1',
                platform: 'linux',
                system: '6.8.0',
                version: '0.1.0',
            }),
            showLicenses: () => Promise.resolve(''),
        },
        appearance: { setSource: () => undefined },
        logger: { log: () => undefined, flush: () => Promise.resolve() },
        window: { ...spyWindow(), on: () => undefined, isMaximized: () => false },
        notices: silentNotices(),
        update: {
            port: inertUpdatePort('0.1.0'),
            support: 'unsupported' as const,
            homepage: 'https://example.org',
            openExternal: () => Promise.resolve(),
            settle: () => Promise.resolve(),
            schedule: {
                configure: () => undefined,
                ready,
                dispose: () => undefined,
            },
        },
        holder: createAppMenuHolder({
            build: () => [],
            install: () => ({ popup: () => undefined }),
            kind: 'async',
        }),
        timeline: createStartupTimeline(),
        handlers,
        formats: [],
        stores: [],
        folderSettings: [],
        importWorker: 'import-worker.js',
        scripts: noScripts().scripts,
    };
}

describe('registerHandlers', () => {
    it('answers only the common channels for an app that brings none of its own', () => {
        const ipc = spyIpc();

        registerHandlers(ipc, depsWith([]));

        expect(ipc.registered()).toContain(CHANNELS.collectionTree);
        expect(ipc.registered()).not.toContain(CHANNELS.wsOpen);
        expect(ipc.registered()).not.toContain(CHANNELS.connectionCreate);
        expect(ipc.registered()).toContain(CHANNELS.updateState);
        expect(ipc.registered()).toContain(CHANNELS.appAbout);
    });

    it('tells the schedule of the updates when the window says it is ready', async () => {
        const ipc = spyIpc();

        registerHandlers(ipc, depsWith([]));
        await ipc.call(CHANNELS.windowReady);

        expect(ready).toHaveBeenCalledOnce();
    });

    it('registers what the app brings after the common channels, and undoes it last', () => {
        const ipc = spyIpc();
        const order: string[] = [];
        const own: AppHandlers = (given, context) => {
            given.handle(CHANNELS.wsOpen, () => Promise.resolve(context.userDataDir));

            return [
                () => {
                    order.push('own');
                },
            ];
        };

        const disposers = registerHandlers(ipc, depsWith([own]));

        expect(ipc.registered().at(-1)).toBe(CHANNELS.wsOpen);
        expect(disposers).toHaveLength(registerHandlers(spyIpc(), depsWith([])).length + 1);

        disposers.at(-1)?.();

        expect(order).toEqual(['own']);
    });
});
