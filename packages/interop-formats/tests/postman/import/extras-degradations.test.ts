import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { extrasDegradations } from '../../../src/postman/import/extras-degradations.js';

describe('extrasDegradations', () => {
    it('says nothing of nothing', () => {
        expect(extrasDegradations({}, 'request')).toEqual({ settings: {}, degradations: [] });
    });

    it('takes the settings of a request that Mandor has, and names the ones it has not', () => {
        const result = extrasDegradations(
            {
                protocolProfileBehavior: {
                    followRedirects: false,
                    maxRedirects: 2,
                    strictSSL: false,
                    disableBodyPruning: true,
                    timeout: 'soon',
                },
            },
            'request',
        );

        expect(result.settings).toEqual({
            followRedirects: false,
            maxRedirects: 2,
            validateTls: false,
        });
        expect(result.degradations).toEqual([
            degradation('settingNoEquivalent', { key: 'disableBodyPruning' }),
            degradation('settingNoEquivalent', { key: 'timeout' }),
        ]);
    });

    it('takes the method on redirect, the cookie jar and the protocol the request asks for', () => {
        const profile = {
            disableCookies: true,
            followOriginalHttpMethod: true,
            protocolVersion: 'http2',
        };

        expect(extrasDegradations({ protocolProfileBehavior: profile }, 'request')).toEqual({
            settings: { httpVersion: 'http2', keepMethodOnRedirect: true, useCookieJar: false },
            degradations: [],
        });
    });

    it('reads a method flag, a cookie flag or a protocol it does not know as no equivalent', () => {
        const profile = {
            disableCookies: 'yes',
            followOriginalHttpMethod: 1,
            protocolVersion: 'http3',
        };

        expect(extrasDegradations({ protocolProfileBehavior: profile }, 'request')).toEqual({
            settings: {},
            degradations: [
                degradation('settingNoEquivalent', { key: 'disableCookies' }),
                degradation('settingNoEquivalent', { key: 'followOriginalHttpMethod' }),
                degradation('settingNoEquivalent', { key: 'protocolVersion' }),
            ],
        });
    });

    it('reads a number or a flag of the wrong type as no equivalent', () => {
        const profile = { maxRedirects: 'many', strictSSL: 'yes', followAuthorizationHeader: 1 };

        expect(extrasDegradations({ protocolProfileBehavior: profile }, 'request')).toEqual({
            settings: {},
            degradations: [
                degradation('settingNoEquivalent', { key: 'maxRedirects' }),
                degradation('settingNoEquivalent', { key: 'strictSSL' }),
                degradation('settingNoEquivalent', { key: 'followAuthorizationHeader' }),
            ],
        });
    });

    it('reads a setting of the wrong type, or a profile that is not an object, as no equivalent', () => {
        expect(
            extrasDegradations({ protocolProfileBehavior: { followRedirects: 'no' } }, 'request'),
        ).toEqual({
            settings: {},
            degradations: [degradation('settingNoEquivalent', { key: 'followRedirects' })],
        });
        expect(extrasDegradations({ protocolProfileBehavior: 3 }, 'request')).toEqual({
            settings: {},
            degradations: [],
        });
    });

    it('does not import the settings of a folder', () => {
        expect(
            extrasDegradations({ protocolProfileBehavior: { followRedirects: false } }, 'folder'),
        ).toEqual({
            settings: {},
            degradations: [degradation('folderSettingsNotImported')],
        });
    });

    it.each([
        [{ lost: 'disabledBody' }, degradation('disabledBody')],
        [{ lost: 'bodyMode:binary' }, degradation('bodyModeUnsupported', { mode: 'binary' })],
        [{ hash: 'top' }, degradation('urlFragmentNotKept', { fragment: 'top' })],
        [{ variable: [] }, degradation('requestVariablesNotImported')],
        [{ proxy: {} }, degradation('proxyNotImported')],
        [{ certificate: {} }, degradation('certificateNotImported')],
        [{ other: 1 }, degradation('postmanKeyNotImported', { key: 'other' })],
    ])('says what it does with %j', (extras, text) => {
        expect(extrasDegradations(extras, 'request').degradations).toEqual([text]);
    });
});
