import { exposeBridge } from '@mandor/host/preload';
import { describe, expect, it, vi } from 'vitest';

import { syncBridgeOf } from '../../../src/preload/sync-bridge.js';

vi.mock('@mandor/host/preload', () => ({ exposeBridge: vi.fn() }));

describe('exposing the bridge of Mandor Request', () => {
    it('gives the window the bridge built by the request app', async () => {
        await import('../../../src/preload/expose-bridge.js');

        expect(exposeBridge).toHaveBeenCalledTimes(1);
        expect(exposeBridge).toHaveBeenCalledWith(syncBridgeOf);
    });
});
