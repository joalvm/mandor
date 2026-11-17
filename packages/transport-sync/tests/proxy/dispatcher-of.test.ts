import { describe, expect, it } from 'vitest';

import { dispatcherOf } from '../../src/proxy/dispatcher-of.js';
import { SyncSendError } from '../../src/send/sync-send-error.js';
import type { ConnectionPhases } from '../../src/timing/connection-phases.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

function phases(): ConnectionPhases {
    return {
        dnsMs: 0,
        connectMs: 0,
        tlsMs: 0,
        firstByteAt: 0,
        lastPhaseEndAt: 0,
        alpnProtocol: null,
        network: null,
    };
}

function request(overrides: Partial<SyncRequest> = {}): SyncRequest {
    const base: SyncRequest = {
        method: 'GET',
        url: 'https://a.test/one',
        headers: [],
        spill: { open: () => Promise.reject(new Error('never')), thresholdBytes: 1 << 20 },
        timeouts: { connectMs: 1_000, totalMs: 5_000 },
        tls: { verify: false },
        redirects: { follow: true, max: 5 },
    };

    return Object.assign(base, overrides);
}

function nameOf(dispatcher: unknown): string {
    return (dispatcher as { constructor: { name: string } }).constructor.name;
}

describe('dispatcherOf', () => {
    it('returns a plain agent when the request names no proxy', () => {
        const dispatcher = dispatcherOf(request(), phases());

        expect(nameOf(dispatcher)).toBe('Agent');
    });

    it('returns a proxy agent when the request names a proxy', () => {
        const dispatcher = dispatcherOf(
            request({ proxy: { url: 'http://127.0.0.1:8888' } }),
            phases(),
        );

        expect(nameOf(dispatcher)).toBe('ProxyAgent');
    });

    it.each(['socks5://127.0.0.1:1080', 'socks5h://ana:pw@127.0.0.1:1080'])(
        'returns a SOCKS5 agent for %s',
        (url) => {
            expect(nameOf(dispatcherOf(request({ proxy: { url } }), phases()))).toBe(
                'Socks5ProxyAgent',
            );
        },
    );

    /** Going direct when the network named a proxy would skip it in silence. */
    it('fails, and never goes direct, on a proxy scheme no agent speaks', () => {
        const dial = (): unknown =>
            dispatcherOf(request({ proxy: { url: 'socks4://127.0.0.1:1080' } }), phases());

        expect(dial).toThrow(SyncSendError);
        expect(dial).toThrow(expect.objectContaining({ reason: 'proxy-scheme' }));
    });
});
