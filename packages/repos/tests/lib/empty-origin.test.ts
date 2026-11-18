import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyOrigin } from '../../src/lib/empty-origin.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('emptying an origin', () => {
    it('asks by id alone: the confirmation by name happened before', async () => {
        const empty = vi.spyOn(bridge.origin, 'empty').mockResolvedValue(success({}));

        await expect(emptyOrigin('team')).resolves.toEqual(success({}));
        expect(empty).toHaveBeenCalledWith({ id: 'team' });
    });

    it('answers the refusal of main as it came', async () => {
        vi.spyOn(bridge.origin, 'empty').mockResolvedValue(failure('fs-write', 'locked'));

        await expect(emptyOrigin('team')).resolves.toMatchObject({
            ok: false,
            error: { code: 'fs-write' },
        });
    });
});
