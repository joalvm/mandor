import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { clientCredentials, PLACE, useTokenHandlers, writeAuth } from './token-handlers-fixture.js';

vi.mock('electron', async () =>
    (await import('./electron-double.js')).electronMock({ openExternal: vi.fn() }),
);

const context = useTokenHandlers();

function credentials(): string[] {
    return clientCredentials(context.server);
}

describe('the auth token handlers of the host', () => {
    it('says there is no token before one was ever asked for', async () => {
        await writeAuth(context.root, credentials());

        await expect(context.ipc.call(CHANNELS.authTokenStatus, PLACE)).resolves.toEqual({
            ok: true,
            value: { state: 'none', expiresAt: null },
        });
    });

    it('says there is no token where no OAuth2 scheme rules', async () => {
        await writeAuth(context.root, ['  type: none']);

        await expect(context.ipc.call(CHANNELS.authTokenStatus, PLACE)).resolves.toEqual({
            ok: true,
            value: { state: 'none', expiresAt: null },
        });
    });

    it('fetches a token and then reports it valid with its expiration, never the token', async () => {
        await writeAuth(context.root, credentials());

        const fetched = await context.ipc.call(CHANNELS.authTokenFetch, PLACE);
        const status = await context.ipc.call(CHANNELS.authTokenStatus, PLACE);

        expect(fetched).toMatchObject({ ok: true, value: { state: 'valid' } });
        expect(status).toEqual(fetched);
        expect(JSON.stringify([fetched, status])).not.toContain('the-access-token');
    });

    it('fetches a new token each time, not the one it already had', async () => {
        await writeAuth(context.root, credentials());
        await context.ipc.call(CHANNELS.authTokenFetch, PLACE);
        await context.ipc.call(CHANNELS.authTokenFetch, PLACE);

        expect(context.server.requests).toHaveLength(2);
    });

    it('forgets the token and the status goes back to none', async () => {
        await writeAuth(context.root, credentials());
        await context.ipc.call(CHANNELS.authTokenFetch, PLACE);

        await expect(context.ipc.call(CHANNELS.authTokenForget, PLACE)).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(context.ipc.call(CHANNELS.authTokenStatus, PLACE)).resolves.toEqual({
            ok: true,
            value: { state: 'none', expiresAt: null },
        });
    });

    it('reads the level the editor holds, which is not saved yet', async () => {
        const own = {
            type: 'oauth2-client-credentials',
            tokenUrl: `${context.server.origin}/token`,
            clientId: 'draft',
            clientSecret: 's3cret',
            clientAuth: 'body',
        };

        await expect(
            context.ipc.call(CHANNELS.authTokenFetch, { ...PLACE, own }),
        ).resolves.toMatchObject({ ok: true, value: { state: 'valid' } });
        expect(context.server.requests[0]?.body.get('client_id')).toBe('draft');
    });
});
