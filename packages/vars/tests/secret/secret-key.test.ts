import { describe, expect, it } from 'vitest';

import { globalsSecretKey, secretKey } from '../../src/secret/secret-key.js';

const parts = {
    repo: 'team-api',
    workspace: 'payments',
    environment: 'prod',
    name: 'TOKEN',
};

describe('the key of a secret', () => {
    it('names the four parts in order, from the repo down to the variable', () => {
        expect(secretKey(parts)).toBe('team-api/payments/prod/TOKEN');
    });

    it('gives the same key to the same four parts', () => {
        expect(secretKey(parts)).toBe(secretKey({ ...parts }));
    });

    /** Four parts because each one repeats on its own: two `prod` are two secrets. */
    it('gives a different key to each part that changes', () => {
        const keys = new Set([
            secretKey(parts),
            secretKey({ ...parts, repo: 'other-api' }),
            secretKey({ ...parts, workspace: 'billing' }),
            secretKey({ ...parts, environment: 'staging' }),
            secretKey({ ...parts, name: 'OTHER' }),
        ]);

        expect(keys.size).toBe(5);
    });

    /**
     * A workspace named `a/b` would otherwise write the key of the environment `b` of the
     * workspace `a`, which is someone else's secret in the same store.
     */
    it('encodes each part, so no part can forge the key of another', () => {
        const forged = secretKey({ ...parts, workspace: 'payments/prod' });

        expect(forged).not.toBe(secretKey({ ...parts, environment: 'prod' }));
        expect(forged).toBe('team-api/payments%2Fprod/prod/TOKEN');
    });
});

describe('globalsSecretKey', () => {
    it('keys a global by its origin and name, apart from every environment', () => {
        expect(globalsSecretKey('repo', 'token')).toBe('repo///token');
        expect(globalsSecretKey('repo', 'token')).not.toBe(
            secretKey({ repo: 'repo', workspace: 'w', environment: 'e', name: 'token' }),
        );
    });
});
