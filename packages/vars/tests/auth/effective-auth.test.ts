import { describe, expect, it } from 'vitest';

import type { AuthConfig } from '@mandor/schema';

import { effectiveAuth } from '../../src/auth/effective-auth.js';

describe('effectiveAuth', () => {
    it('gives the first level that does not inherit, and says which one decided', () => {
        const levels: (AuthConfig | undefined)[] = [
            { type: 'none' },
            { type: 'basic', username: 'u', password: 'p' },
        ];

        expect(effectiveAuth(levels)).toEqual({ auth: { type: 'none' }, from: 0 });
    });

    it('skips the levels that inherit and the absent ones until one decides', () => {
        const levels: (AuthConfig | undefined)[] = [
            { inherit: true },
            undefined,
            { type: 'basic', username: 'u', password: 'p' },
        ];

        expect(effectiveAuth(levels)).toEqual({
            auth: { type: 'basic', username: 'u', password: 'p' },
            from: 2,
        });
    });

    it('falls back to no auth when every level inherits, or none exists', () => {
        expect(effectiveAuth([{ inherit: true }, undefined])).toEqual({
            auth: { type: 'none' },
            from: null,
        });
        expect(effectiveAuth([])).toEqual({ auth: { type: 'none' }, from: null });
    });
});
