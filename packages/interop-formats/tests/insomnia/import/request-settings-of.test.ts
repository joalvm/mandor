import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestSettingsOf } from '../../../src/insomnia/import/request-settings-of.js';

const DEFAULTS = {
    followRedirects: 'global',
    encodeUrl: true,
    rebuildPath: true,
    renderRequestBody: true,
    sendCookies: true,
    storeCookies: true,
};

describe('requestSettingsOf', () => {
    it('says nothing of a request that changes nothing', () => {
        expect(requestSettingsOf(DEFAULTS)).toEqual({ settings: {}, degradations: [] });
    });

    it.each([
        ['on', true],
        ['off', false],
    ])('takes following redirects %s as %s', (followRedirects, expected) => {
        expect(requestSettingsOf({ ...DEFAULTS, followRedirects }).settings).toEqual({
            followRedirects: expected,
        });
    });

    it('takes a request with no cookies at all as one that leaves the jar out', () => {
        const none = { ...DEFAULTS, sendCookies: false, storeCookies: false };

        expect(requestSettingsOf(none)).toEqual({
            settings: { useCookieJar: false },
            degradations: [],
        });
    });

    it.each([
        { sendCookies: false, storeCookies: true },
        { sendCookies: true, storeCookies: false },
    ])('says a jar of one way has no place: %o', (cookies) => {
        const { settings, degradations } = requestSettingsOf({ ...DEFAULTS, ...cookies });

        expect(settings).toEqual({});
        expect(degradations).toEqual([degradation('cookiesOneWay')]);
    });

    it.each([
        ['encodeUrl', degradation('urlNotEncodedInsomnia')],
        ['rebuildPath', degradation('pathNotNormalized')],
        ['renderRequestBody', degradation('bodyNotRendered')],
    ])('says what has no setting when %s is off', (part, note) => {
        const { settings, degradations } = requestSettingsOf({ ...DEFAULTS, [part]: false });

        expect(settings).toEqual({});
        expect(degradations).toEqual([note]);
    });
});
