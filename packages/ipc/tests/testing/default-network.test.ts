import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    networkChooseFileResultSchema,
    networkReadResultSchema,
    emptyResultSchema,
} from '../../src/index.js';
import { defaultNetwork } from '../../src/testing/default-network.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the network area a test gets when it says nothing about the network', () => {
    it('reads the defaults with nothing kept, in the shape its own channel accepts', async () => {
        const answer = networkReadResultSchema.parse(await defaultNetwork().read());

        expect(answer).toMatchObject({
            ok: true,
            value: { settings: { proxy: { mode: 'system' } }, kept: { proxyPassword: false } },
        });
    });

    it('writes, keeps a secret and picks no file, with nothing to say', async () => {
        const area = createFakeBridge().network;

        expect(
            emptyResultSchema.safeParse(await area.write(DEFAULT_NETWORK_SETTINGS)).success,
        ).toBe(true);
        expect(
            emptyResultSchema.safeParse(
                await area.setSecret({ target: { kind: 'proxy' }, value: 'x' }),
            ).success,
        ).toBe(true);
        expect(networkChooseFileResultSchema.parse(await area.chooseFile('ca'))).toEqual({
            ok: true,
            value: null,
        });
    });
});
