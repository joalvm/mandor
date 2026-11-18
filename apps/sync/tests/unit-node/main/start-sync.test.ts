import { failToStart, startHost } from '@mandor/host';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mandor/host', () => ({ failToStart: vi.fn(), startHost: vi.fn() }));
vi.mock('../../../src/main/host-options.js', () => ({
    SYNC_HOST_OPTIONS: { kind: 'sync' },
}));

async function start(): Promise<void> {
    vi.resetModules();
    await import('../../../src/main/start-sync.js');
}

describe('starting Mandor Request', () => {
    beforeEach(() => {
        vi.mocked(startHost).mockReset();
        vi.mocked(failToStart).mockReset();
    });

    it('starts the host with the options of the app', async () => {
        vi.mocked(startHost).mockResolvedValue(undefined);

        await start();

        expect(startHost).toHaveBeenCalledWith({ kind: 'sync' });
        expect(failToStart).not.toHaveBeenCalled();
    });

    it('reports a host that cannot come up', async () => {
        const cause = new Error('no window');

        vi.mocked(startHost).mockRejectedValue(cause);

        await start();
        await vi.waitFor(() => {
            expect(failToStart).toHaveBeenCalledWith(cause);
        });
    });
});
