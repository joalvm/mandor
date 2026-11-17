import { describe, expect, it } from 'vitest';

import { requestItemSchema } from '../../src/request/request-item-schema.js';

const BASE = { name: 'pedidos', method: 'GET', url: '{{baseUrl}}/pedidos' };

describe('the settings block of a request item', () => {
    it('reads a block of settings nobody touched as one that keeps nothing of its own', () => {
        const parsed = requestItemSchema.parse({
            ...BASE,
            settings: {
                validateTls: true,
                timeoutMs: 30000,
                followRedirects: true,
                maxRedirects: 5,
            },
        });

        expect(parsed.settings).toEqual({});
    });

    it('keeps each setting the request decided, the new ones included', () => {
        const settings = {
            followRedirects: true,
            httpVersion: 'http1',
            keepMethodOnRedirect: true,
            maxRedirects: 5,
            timeoutMs: 30000,
            useCookieJar: false,
            validateTls: true,
            followAuthorizationOnRedirect: true,
            maxResponseSizeMiB: 50,
            tlsMinVersion: 'TLSv1.2',
            tlsMaxVersion: 'auto',
            tlsCiphers: 'TLS_AES_128_GCM_SHA256',
        };

        expect(requestItemSchema.parse({ ...BASE, settings }).settings).toEqual(settings);
        expect(() =>
            requestItemSchema.parse({ ...BASE, settings: { httpVersion: 'http3' } }),
        ).toThrow();
        expect(() =>
            requestItemSchema.parse({ ...BASE, settings: { tlsMinVersion: 'SSLv3' } }),
        ).toThrow();
        expect(() =>
            requestItemSchema.parse({ ...BASE, settings: { maxResponseSizeMiB: -1 } }),
        ).toThrow();
    });
});
