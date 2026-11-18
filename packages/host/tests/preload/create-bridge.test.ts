import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createCoreBridge } from '../../src/preload/create-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../src/testing/spy-bridge-ipc.js';

describe('the bridge the preload exposes', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createCoreBridge(ipc);

        await bridge.origin.list();
        await bridge.origin.switch({ id: 'local' });
        await bridge.workspace.list();
        await bridge.session.save({
            session: {
                version: 2,
                activeWorkspaceId: null,
                activeGroupId: 'root',
                grid: { kind: 'leaf', id: 'root', tabs: [], activeTab: null },
                panels: {
                    sidebarWidth: 20,
                    contentSplit: 50,
                    collapsedSections: [],
                    splits: {},
                },
            },
        });

        expect(ipc.calls).toEqual([
            [CHANNELS.originList, undefined],
            [CHANNELS.originSwitch, { id: 'local' }],
            [CHANNELS.workspaceList, undefined],
            [
                CHANNELS.sessionSave,
                {
                    session: {
                        version: 2,
                        activeWorkspaceId: null,
                        activeGroupId: 'root',
                        grid: { kind: 'leaf', id: 'root', tabs: [], activeTab: null },
                        panels: {
                            sidebarWidth: 20,
                            contentSplit: 50,
                            collapsedSections: [],
                            splits: {},
                        },
                    },
                },
            ],
        ]);
    });

    /** Nothing throws across the bridge: a refusal arrives as data and reaches the caller whole. */
    it('hands back the answer of main untouched', async () => {
        const bridge = createCoreBridge(spyBridgeIpc());

        await expect(bridge.origin.switch({ id: 'local' })).resolves.toEqual(REFUSED);
    });

    /** Sockets, recordings, connections and lines of activity are Async's to add, not the core's. */
    it('reaches no area only one app serves', () => {
        const bridge = createCoreBridge(spyBridgeIpc());

        expect(bridge).not.toHaveProperty('ws');
        expect(bridge).not.toHaveProperty('record');
        expect(bridge).not.toHaveProperty('connection');
        expect(bridge.export).not.toHaveProperty('jsonl');
    });

    /**
     * The renderer edge validates too. A push that does not match its schema is a bug in main,
     * and it is louder as a thrown error than as a message the handler quietly believes.
     */
    it('refuses a push that does not match the schema of its channel', () => {
        const ipc = spyBridgeIpc();

        createCoreBridge(ipc).window.onMaximizedChange(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.windowMaximized, { maximized: 'melted' });
        }).toThrow();
    });

    it('refuses a session answer that does not match the renderer contract', async () => {
        const bridge = createCoreBridge(
            spyBridgeIpc({ [CHANNELS.sessionLoad]: { ok: true, value: { tabs: 'many' } } }),
        );

        await expect(bridge.session.load()).rejects.toThrow();
    });

    it('moves the window through the channels that own it', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createCoreBridge(ipc);

        await bridge.window.minimize();
        await bridge.window.toggleMaximize();
        await bridge.window.close();
        await bridge.window.popupAppMenu({ x: 12, y: 39 });
        await bridge.window.relaunch();
        await bridge.window.ready();

        expect(ipc.calls).toEqual([
            [CHANNELS.windowMinimize, undefined],
            [CHANNELS.windowToggleMaximize, undefined],
            [CHANNELS.windowClose, undefined],
            [CHANNELS.windowPopupMenu, { x: 12, y: 39 }],
            [CHANNELS.appRelaunch, undefined],
            [CHANNELS.windowReady, undefined],
        ]);
    });

    it('delivers the maximized push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createCoreBridge(ipc).window.onMaximizedChange((push) => seen.push(push));

        ipc.emit(CHANNELS.windowMaximized, { maximized: true });
        stop();
        ipc.emit(CHANNELS.windowMaximized, { maximized: false });

        expect(seen).toEqual([{ maximized: true }]);
        expect(ipc.listeners.get(CHANNELS.windowMaximized)).toEqual([]);
    });
});
