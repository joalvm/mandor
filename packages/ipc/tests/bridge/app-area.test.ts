import { describe, expect, it } from 'vitest';

import type { AppArea } from '../../src/bridge/app-area.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the app area of the bridge', () => {
    it('offers who the app is and where its licenses are shown', () => {
        const verbs = { about: 1, configureAppearance: 1, openLicenses: 1 } satisfies Record<
            keyof AppArea,
            number
        >;

        expect(Object.keys(verbs)).toHaveLength(3);
    });

    it('answers with a named build and shows the licenses with nothing to say', async () => {
        const { app } = createFakeBridge();

        await expect(app.about()).resolves.toMatchObject({
            ok: true,
            value: { name: 'Mandor', version: '0.0.0' },
        });
        await expect(app.openLicenses()).resolves.toEqual({ ok: true, value: {} });
        await expect(app.configureAppearance({ source: 'dark' })).resolves.toEqual({
            ok: true,
            value: {},
        });
    });

    it('lets the double click the Settings entry of the menu until the window stops listening', () => {
        const bridge = createFakeBridge();
        let clicks = 0;
        const stop = bridge.menu.onSettings(() => {
            clicks += 1;
        });

        bridge.emitMenuSettings();
        stop();
        bridge.emitMenuSettings();

        expect(clicks).toBe(1);
    });
});
