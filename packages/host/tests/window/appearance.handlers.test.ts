import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { spyIpc } from '../../src/testing/handler-harness.js';
import { registerAppearanceHandlers } from '../../src/window/appearance.handlers.js';

function registered() {
    const ipc = spyIpc();
    const setSource = vi.fn();
    const dispose = registerAppearanceHandlers(ipc, { setSource });

    return { dispose, ipc, setSource };
}

describe('the appearance handlers', () => {
    it('hand the scheme the window asked for to the system', async () => {
        const { ipc, setSource } = registered();

        await expect(ipc.call(CHANNELS.appearanceConfigure, { source: 'dark' })).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect(setSource).toHaveBeenCalledWith('dark');
    });

    it('refuse a source that is not a scheme and leave the system as it was', async () => {
        const { ipc, setSource } = registered();

        await expect(
            ipc.call(CHANNELS.appearanceConfigure, { source: 'dark-contrast' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        await expect(ipc.call(CHANNELS.appearanceConfigure)).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        expect(setSource).not.toHaveBeenCalled();
    });

    it('leave no channel registered once disposed', () => {
        const { dispose, ipc } = registered();

        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
