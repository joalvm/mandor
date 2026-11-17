import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { clientCredentials, PLACE, useTokenHandlers, writeAuth } from './token-handlers-fixture.js';

vi.mock('electron', async () =>
    (await import('./electron-double.js')).electronMock({ openExternal: vi.fn() }),
);

const context = useTokenHandlers();

describe('the auth token handlers of the host, when they refuse', () => {
    it('refuses to fetch where no OAuth2 scheme rules: there is nothing to ask a token for', async () => {
        await writeAuth(context.root, ['  type: none']);

        await expect(context.ipc.call(CHANNELS.authTokenFetch, PLACE)).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('answers a token that did not come with its code', async () => {
        const lines = clientCredentials(context.server);

        await writeAuth(context.root, [
            ...lines.slice(0, 1),
            '  tokenUrl: file:///etc/passwd',
            ...lines.slice(2),
        ]);

        await expect(context.ipc.call(CHANNELS.authTokenFetch, PLACE)).resolves.toMatchObject({
            ok: false,
            error: { code: 'auth-token-failed' },
        });
    });

    it('refuses a request that is not the shape of one', async () => {
        await expect(
            context.ipc.call(CHANNELS.authTokenStatus, { workspaceId: 5 }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('stops answering when it is disposed', () => {
        context.dispose();

        expect(() => context.ipc.call(CHANNELS.authTokenStatus, PLACE)).toThrow();
    });
});
