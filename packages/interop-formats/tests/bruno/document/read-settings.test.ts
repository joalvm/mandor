import { describe, expect, it } from 'vitest';

import { settingsOf } from '../../../src/bruno/document/read-settings.js';

describe('the settings a request decides', () => {
    it('reads what it decides', () => {
        const settings = {
            encodeUrl: false,
            timeout: 5,
            followRedirects: false,
            maxRedirects: 2,
            forwardAuthorizationHeader: true,
        };

        expect(settingsOf(settings)).toEqual(settings);
    });

    it('takes an inherited value, or one of the wrong type, as no decision', () => {
        expect(
            settingsOf({ encodeUrl: 'inherit', timeout: 'inherit', followRedirects: 1 }),
        ).toEqual({});
        expect(settingsOf(undefined)).toEqual({});
    });
});
