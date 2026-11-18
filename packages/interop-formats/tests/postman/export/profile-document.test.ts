import type { RequestSettingsOverrides } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { profileDocumentOf } from '../../../src/postman/export/profile-document.js';
import { extrasDegradations } from '../../../src/postman/import/extras-degradations.js';

describe('the settings of a request as Postman says them', () => {
    it('writes no key for a request that decides nothing', () => {
        expect(profileDocumentOf({})).toEqual({});
        expect(profileDocumentOf({ tlsCiphers: '', tlsMinVersion: 'auto' })).toEqual({});
    });

    it('leaves out what a collection has no place for', () => {
        expect(profileDocumentOf({ timeoutMs: 1, maxResponseSizeMiB: 2 })).toEqual({});
    });

    it('says each setting under the name Postman gives it', () => {
        expect(
            profileDocumentOf({
                followRedirects: false,
                maxRedirects: 3,
                validateTls: false,
                keepMethodOnRedirect: true,
                useCookieJar: false,
                httpVersion: 'http2',
                followAuthorizationOnRedirect: true,
                tlsCiphers: 'A:B',
            }),
        ).toEqual({
            protocolProfileBehavior: {
                followRedirects: false,
                maxRedirects: 3,
                strictSSL: false,
                followOriginalHttpMethod: true,
                disableCookies: true,
                protocolVersion: 'http2',
                followAuthorizationHeader: true,
                tlsCipherSelection: ['A', 'B'],
            },
        });
    });

    it.each<[RequestSettingsOverrides, string[]]>([
        [{ tlsMinVersion: 'TLSv1.2' }, ['TLSv1', 'TLSv1_1']],
        [{ tlsMaxVersion: 'TLSv1.2' }, ['TLSv1_3']],
        [{ tlsMinVersion: 'TLSv1.1', tlsMaxVersion: 'TLSv1.2' }, ['TLSv1', 'TLSv1_3']],
    ])('says the bounds of %j as the versions it leaves out', (settings, off) => {
        expect(profileDocumentOf(settings)).toEqual({
            protocolProfileBehavior: { tlsDisabledProtocols: off },
        });
    });

    it('reads back what it wrote', () => {
        const settings: RequestSettingsOverrides = {
            followRedirects: false,
            maxRedirects: 3,
            validateTls: false,
            keepMethodOnRedirect: true,
            useCookieJar: true,
            httpVersion: 'http1',
            followAuthorizationOnRedirect: false,
            tlsCiphers: 'A:B',
            tlsMinVersion: 'TLSv1.1',
            tlsMaxVersion: 'TLSv1.2',
        };

        expect(extrasDegradations(profileDocumentOf(settings), 'request')).toEqual({
            settings,
            degradations: [],
        });
    });
});
