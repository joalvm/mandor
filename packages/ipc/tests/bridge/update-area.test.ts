import { describe, expect, it } from 'vitest';

import type { UpdateArea } from '../../src/bridge/update-area.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the update area of the bridge', () => {
    it('offers the state, what the person asks for, the configuration and the push of every change', () => {
        const verbs = {
            check: 1,
            configure: 1,
            download: 1,
            install: 1,
            onChanged: 1,
            openPage: 1,
            state: 1,
        } satisfies Record<keyof UpdateArea, number>;

        expect(Object.keys(verbs)).toHaveLength(7);
    });

    it('starts as an install with nothing to say', async () => {
        const bridge = createFakeBridge();

        await expect(bridge.update.state()).resolves.toMatchObject({
            ok: true,
            value: { phase: 'idle', support: 'unsupported' },
        });
        await expect(bridge.update.check()).resolves.toEqual({ ok: true, value: {} });
    });

    it('lets the double deliver a state and stop at the unsubscribe', () => {
        const bridge = createFakeBridge();
        const heard: unknown[] = [];
        const stop = bridge.update.onChanged((state) => heard.push(state));
        const state = { phase: 'ready', support: 'full', current: '0.1.0' } as const;

        bridge.emitUpdate(state);
        stop();
        bridge.emitUpdate({ ...state, phase: 'idle' });

        expect(heard).toEqual([state]);
    });
});
