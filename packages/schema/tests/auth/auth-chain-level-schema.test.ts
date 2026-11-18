import { describe, expect, it } from 'vitest';

import { authChainLevelSchema } from '../../src/auth/auth-chain-level-schema.js';

describe('the schema of one level of the auth chain', () => {
    it('takes a folder level with its auth and a workspace level that says nothing', () => {
        const folder = {
            place: { kind: 'folder', path: 'orders' },
            name: 'Orders',
            auth: { type: 'bearer', token: '{{token}}' },
        };
        const workspace = { place: { kind: 'workspace' }, name: 'Personal' };

        expect(authChainLevelSchema.parse(folder)).toEqual(folder);
        expect(authChainLevelSchema.parse(workspace)).toEqual(workspace);
    });

    it('refuses a level with an unknown place or a key out of contract', () => {
        expect(
            authChainLevelSchema.safeParse({ place: { kind: 'origin' }, name: 'x' }).success,
        ).toBe(false);
        expect(
            authChainLevelSchema.safeParse({ place: { kind: 'workspace' }, name: 'x', extra: 1 })
                .success,
        ).toBe(false);
    });
});
