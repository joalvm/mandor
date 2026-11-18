import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createMenuBridge } from '../../../src/preload/bridges/menu-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the menu bridge of the preload', () => {
    it('sends the language the renderer speaks to the one channel of the menu', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createMenuBridge(createBridgeCall(ipc), ipc);

        await bridge.speak({ language: 'es' });

        expect(ipc.calls).toEqual([[CHANNELS.menuLanguage, { language: 'es' }]]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        const ipc = spyBridgeIpc();

        await expect(
            createMenuBridge(createBridgeCall(ipc), ipc).speak({ language: 'es' }),
        ).resolves.toEqual(REFUSED);
    });

    it('delivers the step the Edit menu asked for and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createMenuBridge(createBridgeCall(ipc), ipc).onEditStep((push) => {
            seen.push(push);
        });

        ipc.emit(CHANNELS.menuEdit, { step: 'undo' });
        stop();
        ipc.emit(CHANNELS.menuEdit, { step: 'redo' });

        expect(seen).toEqual([{ step: 'undo' }]);
        expect(ipc.listeners.get(CHANNELS.menuEdit)).toEqual([]);
    });

    it('tells the window the Settings entry was clicked and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        let clicks = 0;
        const stop = createMenuBridge(createBridgeCall(ipc), ipc).onSettings(() => {
            clicks += 1;
        });

        ipc.emit(CHANNELS.menuSettings, {});
        stop();
        ipc.emit(CHANNELS.menuSettings, {});

        expect(clicks).toBe(1);
        expect(ipc.listeners.get(CHANNELS.menuSettings)).toEqual([]);
    });

    it('refuses a Settings push that carries something', () => {
        const ipc = spyBridgeIpc();

        createMenuBridge(createBridgeCall(ipc), ipc).onSettings(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.menuSettings, { section: 'proxy' });
        }).toThrow();
    });

    /** A push that does not parse is a bug in main, and it is louder thrown than believed. */
    it('refuses a step that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createMenuBridge(createBridgeCall(ipc), ipc).onEditStep(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.menuEdit, { step: 'paste' });
        }).toThrow();
    });
});
