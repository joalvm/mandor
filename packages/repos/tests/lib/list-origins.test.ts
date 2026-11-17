import { failure, success } from '@mandor/ipc';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listOrigins } from '../../src/lib/list-origins.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('listing the origins of the machine', () => {
    it('answers the list main wrote, in the order it wrote it', async () => {
        const origins = [
            createLocalOrigin('Local'),
            createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' }),
        ];

        vi.spyOn(bridge.origin, 'list').mockResolvedValue(success(origins));

        await expect(listOrigins()).resolves.toEqual(success(origins));
    });

    it('answers the refusal of main as it came', async () => {
        vi.spyOn(bridge.origin, 'list').mockResolvedValue(failure('fs-read', 'unreadable'));

        await expect(listOrigins()).resolves.toMatchObject({
            ok: false,
            error: { code: 'fs-read' },
        });
    });
});
