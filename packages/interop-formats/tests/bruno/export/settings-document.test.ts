import { describe, expect, it } from 'vitest';

import { settingsDocumentOf } from '../../../src/bruno/export/settings-document.js';

describe('the settings of a request as Bruno says them', () => {
    it('writes no key for a request that decides nothing Bruno has', () => {
        expect(settingsDocumentOf({})).toEqual({});
        expect(settingsDocumentOf({ validateTls: false })).toEqual({});
    });

    it('says each setting under the name Bruno gives it', () => {
        expect(
            settingsDocumentOf({
                timeoutMs: 5,
                followRedirects: false,
                maxRedirects: 2,
                followAuthorizationOnRedirect: true,
            }),
        ).toEqual({
            settings: {
                timeout: 5,
                followRedirects: false,
                maxRedirects: 2,
                forwardAuthorizationHeader: true,
            },
        });
    });
});
