import { describe, expect, it } from 'vitest';

import { AuthTokenError } from '../../../src/auth/auth-token-error.js';
import { tokenFailure } from '../../../src/auth/oauth/token-failure.js';

describe('tokenFailure', () => {
    it('lets a failure the host already named pass as it is', () => {
        const named = new AuthTokenError('auth-cancelled', 'cut');

        expect(tokenFailure(named)).toBe(named);
    });

    it('names an abort as a cancellation, wherever the abort was wrapped', () => {
        const abort = new DOMException('stopped', 'AbortError');

        expect(tokenFailure(abort).code).toBe('auth-cancelled');
        expect(tokenFailure(new Error('wrapped', { cause: abort })).code).toBe('auth-cancelled');
    });

    it('names anything else as a token that did not come, keeping the message for the log', () => {
        const failure = tokenFailure(new Error('invalid_client'));

        expect(failure.code).toBe('auth-token-failed');
        expect(failure.message).toContain('invalid_client');
        expect(tokenFailure('plain text').code).toBe('auth-token-failed');
    });
});
