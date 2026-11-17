import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createCookiesBridge } from '../../../src/preload/cookies-bridge.js';
import { REFUSED, spyBridgeIpc } from '@mandor/host/testing/bridge';

const PLACE = { workspaceId: 'demo', environmentId: 'staging' };
const SID = { ...PLACE, domain: 'a.test', path: '/', name: 'sid' };
const ROW = {
    domain: 'a.test',
    path: '/',
    name: 'sid',
    value: 'abc',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: null,
};

describe('the cookies bridge', () => {
    it('lists, sets, deletes and clears through the channels that own them', async () => {
        const ok = { ok: true, value: {} };
        const ipc = spyBridgeIpc({
            [CHANNELS.cookiesList]: { ok: true, value: { cookies: [ROW] } },
            [CHANNELS.cookiesSet]: ok,
            [CHANNELS.cookiesDelete]: ok,
            [CHANNELS.cookiesClear]: ok,
        });
        const bridge = createCookiesBridge(bridgeKitOf(ipc));

        expect(await bridge.list(PLACE)).toEqual({ ok: true, value: { cookies: [ROW] } });
        expect(await bridge.set({ ...SID, value: 'new' })).toEqual(ok);
        expect(await bridge.delete(SID)).toEqual(ok);
        expect(await bridge.clear(PLACE)).toEqual(ok);
        expect(ipc.calls.map(([channel]) => channel)).toEqual([
            CHANNELS.cookiesList,
            CHANNELS.cookiesSet,
            CHANNELS.cookiesDelete,
            CHANNELS.cookiesClear,
        ]);
    });

    it('answers a refusal as it is', async () => {
        const ipc = spyBridgeIpc();

        expect(await createCookiesBridge(bridgeKitOf(ipc)).set({ ...SID, value: 'new' })).toEqual(
            REFUSED,
        );
    });

    /** What main answers is validated here: an answer out of contract is a bug in main. */
    it('throws on an answer that does not match its contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.cookiesList]: { ok: true, value: { cookies: [{}] } },
        });

        await expect(createCookiesBridge(bridgeKitOf(ipc)).list(PLACE)).rejects.toThrow();
    });
});
