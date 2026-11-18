import { describe, expect, it } from 'vitest';

import { retryNowSocket } from '../../../../src/main/ws/retry-now-socket.js';
import type { SocketManager } from '../../../../src/main/ws/socket-manager.js';

function manager(retryNow: SocketManager['retryNow']): SocketManager {
    return {
        close: () => Promise.resolve(),
        disposeAll: () => undefined,
        open: () => Promise.resolve(),
        retryNow,
        send: () => Promise.resolve(),
    };
}

describe('asking the port to retry a connection now', () => {
    it('hands the connection id to the port', async () => {
        const seen: string[] = [];

        await expect(
            retryNowSocket(
                manager((request) => {
                    seen.push(request.connectionId);

                    return Promise.resolve();
                }),
                { connectionId: 'gateway' },
            ),
        ).resolves.toEqual({ ok: true, value: {} });
        expect(seen).toEqual(['gateway']);
    });

    it('refuses a request that names no connection', async () => {
        await expect(
            retryNowSocket(
                manager(() => Promise.resolve()),
                {},
            ),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('answers a port that refused with the code of the channel', async () => {
        await expect(
            retryNowSocket(
                manager(() => Promise.reject(new Error('boom'))),
                { connectionId: 'gateway' },
            ),
        ).resolves.toMatchObject({ ok: false, error: { code: 'unknown' } });
    });
});
