import { failure, success } from '@mandor/ipc';
import { createOrigin } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { addOrigin } from '../../src/lib/add-origin.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

describe('adding an origin', () => {
    it('hands main the name and the address the user wrote, and answers the origin it made', async () => {
        const add = vi.spyOn(bridge.origin, 'add').mockResolvedValue(success(TEAM));

        const result = await addOrigin({ name: 'Team', url: 'https://github.com/team/api.git' });

        expect(add).toHaveBeenCalledWith({ name: 'Team', url: 'https://github.com/team/api.git' });
        expect(result).toEqual(success(TEAM));
    });

    /** An origin that does not answer comes back as a failure and is never stored in silence. */
    it('answers the refusal of main as it came', async () => {
        vi.spyOn(bridge.origin, 'add').mockResolvedValue(
            failure('origin-unreachable', 'no answer'),
        );

        const result = await addOrigin({ name: 'Team', url: 'https://example.com/x.git' });

        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ error: { code: 'origin-unreachable' } });
    });
});
