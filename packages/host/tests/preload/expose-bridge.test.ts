import { afterEach, describe, expect, it, vi } from 'vitest';

import { exposeBridge } from '../../src/preload/expose-bridge.js';

const { contextBridge, ipcRenderer } = vi.hoisted(() => ({
    contextBridge: { exposeInMainWorld: vi.fn() },
    ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
}));

vi.mock('electron', () => ({ contextBridge, ipcRenderer }));

function exposed(): Record<string, unknown> {
    const [[name, bridge]] = contextBridge.exposeInMainWorld.mock.calls as [[string, never]];

    expect(name).toBe('mandor');

    return bridge;
}

describe('the bridge a preload exposes', () => {
    afterEach(() => {
        contextBridge.exposeInMainWorld.mockClear();
    });

    it('is the core as it is when the app adds nothing to it', () => {
        exposeBridge();

        expect(Object.keys(exposed()).sort()).toEqual(
            [
                'app',
                'auth',
                'collections',
                'conflict',
                'notice',
                'update',
                'log',
                'doc',
                'environment',
                'export',
                'globals',
                'import',
                'menu',
                'network',
                'origin',
            ]
                .concat(['repo', 'scripts', 'secret', 'session', 'window', 'workspace'])
                .sort(),
        );
    });

    it('is what the app makes of the core, with the kit its own areas are built with', () => {
        const extra = { ping: () => 'pong' };

        exposeBridge((core, kit) => ({ ...core, extra, kit }));

        const bridge = exposed();

        expect(bridge).toMatchObject({ extra });
        expect(bridge).toHaveProperty('kit.call');
        expect(bridge).toHaveProperty('kit.subscribe');
        expect(bridge).toHaveProperty('collections');
    });
});
