import { afterEach, describe, expect, it } from 'vitest';

import {
    forgetSessionSecrets,
    rememberSessionSecrets,
    sessionSecrets,
} from '../../src/secret/session-secrets.js';

afterEach(() => {
    forgetSessionSecrets();
});

describe('the secrets resolved in this session', () => {
    it('starts with nothing to hide', () => {
        expect(sessionSecrets()).toEqual([]);
    });

    it('keeps what a resolution found, in one copy per value', () => {
        rememberSessionSecrets(['tok_abcdefgh']);
        rememberSessionSecrets(['tok_abcdefgh', 'other_secret_value']);

        expect(sessionSecrets()).toEqual(['tok_abcdefgh', 'other_secret_value']);
    });

    /** The set lives as long as the process. Closing everything empties it. */
    it('forgets every value when the session ends', () => {
        rememberSessionSecrets(['tok_abcdefgh']);
        forgetSessionSecrets();

        expect(sessionSecrets()).toEqual([]);
    });
});
