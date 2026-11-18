import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestSettingsOf } from '../../../src/bruno/import/request-settings-of.js';

describe('the settings of a request of Bruno', () => {
    it('takes what it decides under the names Mandor gives it', () => {
        expect(
            requestSettingsOf({
                timeout: 5,
                followRedirects: false,
                maxRedirects: 2,
                forwardAuthorizationHeader: true,
            }),
        ).toEqual({
            settings: {
                timeoutMs: 5,
                followRedirects: false,
                maxRedirects: 2,
                followAuthorizationOnRedirect: true,
            },
            degradations: [],
        });
    });

    it('leaves to the defaults a value Mandor would refuse', () => {
        expect(requestSettingsOf({ timeout: -1 }).settings).toEqual({});
    });

    it('says the one thing it has no setting for', () => {
        expect(requestSettingsOf({ encodeUrl: false }).degradations).toEqual([
            degradation('urlNotEncodedBruno'),
        ]);
        expect(requestSettingsOf({ encodeUrl: true }).degradations).toEqual([]);
    });
});
