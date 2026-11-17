import { describe, expect, it } from 'vitest';

import { storedTokenOf } from '../../../src/auth/oauth/stored-token.js';

const NOW = 1_000_000;

describe('storedTokenOf', () => {
    it('takes the expiration from the seconds the server said it lasts', () => {
        expect(
            storedTokenOf({ access_token: 'a', token_type: 'bearer', expires_in: 60 }, NOW),
        ).toEqual({ accessToken: 'a', expiresAt: NOW + 60_000 });
    });

    it('keeps the refresh token the server rotated in', () => {
        expect(
            storedTokenOf(
                { access_token: 'a', token_type: 'bearer', expires_in: 1, refresh_token: 'r2' },
                NOW,
                'r1',
            ).refreshToken,
        ).toBe('r2');
    });

    it('keeps the one it had when the server did not rotate it', () => {
        expect(
            storedTokenOf({ access_token: 'a', token_type: 'bearer', expires_in: 1 }, NOW, 'r1')
                .refreshToken,
        ).toBe('r1');
    });

    it('supposes an hour when the server did not say how long the token lives', () => {
        expect(storedTokenOf({ access_token: 'a', token_type: 'bearer' }, NOW).expiresAt).toBe(
            NOW + 3_600_000,
        );
    });
});
