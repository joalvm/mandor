import { exposeBridge } from '@mandor/host/preload';
import { describe, expect, it, vi } from 'vitest';

import { asyncBridgeOf } from '../../../src/preload/async-bridge.js';

vi.mock('@mandor/host/preload', () => ({ exposeBridge: vi.fn() }));

describe('exposing the bridge of Mandor Realtime', () => {
    it('gives the window the bridge built by the realtime app', async () => {
        await import('../../../src/preload/expose-bridge.js');

        expect(exposeBridge).toHaveBeenCalledTimes(1);
        expect(exposeBridge).toHaveBeenCalledWith(asyncBridgeOf);
    });
});
