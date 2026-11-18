import { describe, expect, it } from 'vitest';

import { requestSettingsDocumentOf } from '../../../src/insomnia/export/request-settings-document.js';
import { requestSettingsOf } from '../../../src/insomnia/import/request-settings-of.js';

const FULL = {
    renderRequestBody: true,
    encodeUrl: true,
    followRedirects: 'global',
    rebuildPath: true,
    cookies: { send: true, store: true },
};

describe('requestSettingsDocumentOf', () => {
    it('writes no key for a request that decides nothing Insomnia has', () => {
        expect(requestSettingsDocumentOf({})).toEqual({});
        expect(requestSettingsDocumentOf({ timeoutMs: 10 })).toEqual({});
    });

    it.each([
        [true, 'on'],
        [false, 'off'],
    ])('writes following redirects %s as %s, whole', (followRedirects, word) => {
        expect(requestSettingsDocumentOf({ followRedirects })).toEqual({
            settings: { ...FULL, followRedirects: word },
        });
    });

    it.each([
        [true, true],
        [false, false],
    ])('writes the jar %s as both ways', (useCookieJar, way) => {
        expect(requestSettingsDocumentOf({ useCookieJar })).toEqual({
            settings: { ...FULL, cookies: { send: way, store: way } },
        });
    });

    it('comes back as it left', () => {
        const left = requestSettingsDocumentOf({ followRedirects: false, useCookieJar: false });
        const written = left['settings'] as typeof FULL;

        expect(
            requestSettingsOf({
                followRedirects: written.followRedirects,
                encodeUrl: written.encodeUrl,
                rebuildPath: written.rebuildPath,
                renderRequestBody: written.renderRequestBody,
                sendCookies: written.cookies.send,
                storeCookies: written.cookies.store,
            }),
        ).toEqual({
            settings: { followRedirects: false, useCookieJar: false },
            degradations: [],
        });
    });
});
