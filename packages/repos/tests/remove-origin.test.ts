import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { removeOrigin } from '../src/lib/remove-origin.js';

const fakeBridge = bridge as FakeBridge;

describe('removeOrigin', () => {
    it('asks by id alone: the confirmation by name happened before', async () => {
        const remove = vi.spyOn(fakeBridge.origin, 'remove').mockResolvedValue(success({}));

        await expect(removeOrigin('team')).resolves.toEqual(success({}));
        expect(remove).toHaveBeenCalledWith({ id: 'team' });
    });
});
