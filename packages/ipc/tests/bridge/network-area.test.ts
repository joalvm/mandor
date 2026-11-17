import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { NetworkArea } from '../../src/bridge/network-area.js';
import { success } from '../../src/result/success.js';

describe('NetworkArea', () => {
    /** The double implements the contract: a method added to the area stops this from compiling. */
    it('answers read, write, the secret and the file, each with a Result', async () => {
        const area: NetworkArea = {
            read: () =>
                Promise.resolve(
                    success({
                        settings: DEFAULT_NETWORK_SETTINGS,
                        kept: { proxyPassword: false, passphrases: [] },
                    }),
                ),
            write: () => Promise.resolve(success({})),
            setSecret: () => Promise.resolve(success({})),
            chooseFile: () => Promise.resolve(success('ca.pem')),
        };

        await expect(area.chooseFile('ca')).resolves.toEqual({ ok: true, value: 'ca.pem' });
        await expect(area.write(DEFAULT_NETWORK_SETTINGS)).resolves.toEqual({
            ok: true,
            value: {},
        });
    });
});
