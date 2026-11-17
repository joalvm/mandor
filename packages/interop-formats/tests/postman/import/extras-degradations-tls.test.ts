import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { extrasDegradations } from '../../../src/postman/import/extras-degradations.js';

describe('the TLS and the authorization Postman keeps per request', () => {
    it('reads the authorization across hosts, the suites and the versions left on', () => {
        const { settings, degradations } = extrasDegradations(
            {
                protocolProfileBehavior: {
                    followAuthorizationHeader: true,
                    tlsCipherSelection: ['TLS_AES_128_GCM_SHA256', 'ECDHE-RSA-AES128-GCM-SHA256'],
                    tlsDisabledProtocols: ['TLSv1', 'TLSv1_1'],
                },
            },
            'request',
        );

        expect(settings).toEqual({
            followAuthorizationOnRedirect: true,
            tlsCiphers: 'TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256',
            tlsMinVersion: 'TLSv1.2',
        });
        expect(degradations).toEqual([]);
    });

    it('bounds the newest version when Postman switched the newest off', () => {
        const { settings } = extrasDegradations(
            { protocolProfileBehavior: { tlsDisabledProtocols: ['TLSv1_3'] } },
            'request',
        );

        expect(settings).toEqual({ tlsMaxVersion: 'TLSv1.2' });
    });

    /** Two bounds cannot say "everything but 1.2": the line says it was not kept. */
    it('says so when the versions left on have a hole, or none is left', () => {
        const holed = extrasDegradations(
            { protocolProfileBehavior: { tlsDisabledProtocols: ['TLSv1_2'] } },
            'request',
        );
        const none = extrasDegradations(
            {
                protocolProfileBehavior: {
                    tlsDisabledProtocols: ['TLSv1', 'TLSv1_1', 'TLSv1_2', 'TLSv1_3'],
                    tlsCipherSelection: [],
                },
            },
            'request',
        );
        const unlisted = extrasDegradations(
            {
                protocolProfileBehavior: {
                    tlsDisabledProtocols: 'TLSv1',
                    tlsCipherSelection: 'TLS_AES_128_GCM_SHA256',
                },
            },
            'request',
        );

        expect(holed.settings).toEqual({});
        expect(holed.degradations).toEqual([
            degradation('settingNoEquivalent', { key: 'tlsDisabledProtocols' }),
        ]);
        expect(none.degradations).toHaveLength(2);
        expect(unlisted.settings).toEqual({});
        expect(unlisted.degradations).toEqual([
            degradation('settingNoEquivalent', { key: 'tlsCipherSelection' }),
        ]);
    });
});
