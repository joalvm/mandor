import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { checkOrigin } from '../src/lib/check-origin.js';

const fakeBridge = bridge as FakeBridge;

describe('checkOrigin', () => {
    it('asks the channel with the id, and the answer is what the channel said', async () => {
        const check = vi
            .spyOn(fakeBridge.origin, 'check')
            .mockResolvedValue(success({ id: 'team', reachable: true }));

        await expect(checkOrigin('team')).resolves.toEqual(
            success({ id: 'team', reachable: true }),
        );
        expect(check).toHaveBeenCalledWith({ id: 'team' });
    });
});
