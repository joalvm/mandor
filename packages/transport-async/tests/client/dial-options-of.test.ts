import { HttpsProxyAgent } from 'https-proxy-agent';
import { describe, expect, it } from 'vitest';

import { DEFAULT_HANDSHAKE_TIMEOUT_MS } from '../../src/client/client-network.js';
import { dialOptionsOf } from '../../src/client/dial-options-of.js';

describe('the options a websocket dials with', () => {
    it('waits the default of the package and sets nothing it was not asked to', () => {
        expect(dialOptionsOf({})).toEqual({ handshakeTimeout: DEFAULT_HANDSHAKE_TIMEOUT_MS });
    });

    it('carries every option the client was given', () => {
        const options = dialOptionsOf({
            handshakeTimeoutMs: 1_500,
            headers: { 'x-a': '1' },
            maximumPayloadBytes: 64,
            verifyCertificate: false,
            proxy: { url: 'http://proxy:8080' },
        });

        expect(options).toMatchObject({
            handshakeTimeout: 1_500,
            headers: { 'x-a': '1' },
            maxPayload: 64,
            rejectUnauthorized: false,
        });
        expect(options.agent).toBeInstanceOf(HttpsProxyAgent);
    });

    it('keeps the certificate checked unless the client turned it off', () => {
        expect(dialOptionsOf({ verifyCertificate: true })).not.toHaveProperty('rejectUnauthorized');
    });
});
