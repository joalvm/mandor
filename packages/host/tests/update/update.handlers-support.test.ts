import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { NEXT, start } from './handlers-harness.js';

describe('the update handlers of an install that cannot do all of it', () => {
    it('refuses to open a page that is not https', async () => {
        const plain = start('manual-only', 'http://example.org');

        await expect(plain.ipc.call(CHANNELS.updateOpenPage)).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        expect(plain.openExternal).not.toHaveBeenCalled();
        plain.dispose();
    });

    it('does nothing for an install that cannot update, and answers as if it had', async () => {
        const inert = start('unsupported');

        await inert.ipc.call(CHANNELS.updateCheck);
        await inert.ipc.call(CHANNELS.updateDownload);
        inert.emit({ type: 'update-downloaded', info: NEXT });
        await inert.ipc.call(CHANNELS.updateInstall);

        expect(inert.port.checkForUpdates).not.toHaveBeenCalled();
        expect(inert.port.downloadUpdate).not.toHaveBeenCalled();
        expect(inert.port.quitAndInstall).not.toHaveBeenCalled();
        inert.dispose();
    });

    it('only looks on an install that can tell of a version and not take it', async () => {
        const manual = start('manual-only');

        await manual.ipc.call(CHANNELS.updateCheck);
        await manual.ipc.call(CHANNELS.updateDownload);

        expect(manual.port.checkForUpdates).toHaveBeenCalledTimes(1);
        expect(manual.port.downloadUpdate).not.toHaveBeenCalled();
        manual.dispose();
    });
});
