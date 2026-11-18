import { describe, expect, it } from 'vitest';

import type { AuthArea } from '../../src/bridge/auth-area.js';
import { success } from '../../src/result/success.js';

describe('AuthArea', () => {
    /** The double implements the contract: a method added to the area stops this from compiling. */
    it('answers read, write and the three of the token, each with a Result', async () => {
        const area: AuthArea = {
            read: () => Promise.resolve(success({ auth: null })),
            write: () => Promise.resolve(success({})),
            tokenStatus: () => Promise.resolve(success({ state: 'none', expiresAt: null })),
            tokenFetch: () => Promise.resolve(success({ state: 'none', expiresAt: null })),
            tokenForget: () => Promise.resolve(success({})),
        };

        await expect(area.read({ workspaceId: 'api-pagos' })).resolves.toEqual({
            ok: true,
            value: { auth: null },
        });
    });
});
