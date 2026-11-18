import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createOrigin } from '@mandor/schema';
import { describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { renameOrigin } from '../src/lib/rename-origin.js';

const fakeBridge = bridge as FakeBridge;
const TEAM = createOrigin({ id: 'equipo', name: 'Equipo', url: 'https://github.com/team/api.git' });

describe('renameOrigin', () => {
    it('hands the id and the trimmed name to the channel, and the origin comes back', async () => {
        const rename = vi.spyOn(fakeBridge.origin, 'rename').mockResolvedValue(success(TEAM));

        await expect(renameOrigin({ id: TEAM.id, name: 'Equipo' })).resolves.toEqual(success(TEAM));
        expect(rename).toHaveBeenCalledWith({ id: TEAM.id, name: 'Equipo' });
    });
});
