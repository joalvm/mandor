import { describe, expect, it } from 'vitest';

import type { AuthChainLevel } from '../../src/auth/auth-chain-level.js';

describe('AuthChainLevel', () => {
    it('names a folder level with the auth it carries, or none', () => {
        const folder: AuthChainLevel = {
            place: { kind: 'folder', path: 'pedidos' },
            name: 'Pedidos',
            auth: { type: 'none' },
        };

        expect(folder.name).toBe('Pedidos');
    });

    it('names the workspace level, where inheriting means no auth above', () => {
        const workspace: AuthChainLevel = {
            place: { kind: 'workspace' },
            name: 'Personal',
            auth: undefined,
        };

        expect(workspace.auth).toBeUndefined();
    });
});
