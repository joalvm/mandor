import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { PLACE, useTokenHandlers, writeAuth } from './token-handlers-fixture.js';

const browser = vi.hoisted(() => ({
    openExternal: vi.fn<(url: string) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('electron', async () => (await import('./electron-double.js')).electronMock(browser));

const context = useTokenHandlers();

describe('the auth token handlers of the host, with a code flow', () => {
    it('opens the browser and keeps the token it traded for', async () => {
        await writeAuth(context.root, [
            '  type: oauth2-code-pkce',
            `  authorizationUrl: ${context.server.origin}/authorize`,
            `  tokenUrl: ${context.server.origin}/token`,
            '  clientId: client',
        ]);
        browser.openExternal.mockImplementation(async (raw) => {
            const url = new URL(raw);
            const back = new URL(url.searchParams.get('redirect_uri') ?? '');

            back.searchParams.set('code', 'the-code');
            back.searchParams.set('state', url.searchParams.get('state') ?? '');
            await fetch(back);
        });

        const fetched = await context.ipc.call(CHANNELS.authTokenFetch, PLACE);

        expect(fetched).toMatchObject({ ok: true, value: { state: 'valid' } });
        expect(browser.openExternal).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(fetched)).not.toContain('the-refresh-token');
    });
});
