import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadUpdate, installUpdate, openUpdatePage } from '../src/lib/update-actions.js';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('what the window can ask of the updates', () => {
    it.each([
        ['download', downloadUpdate],
        ['install', installUpdate],
        ['openPage', openUpdatePage],
    ] as const)('hands %s to main and waits for nothing', (call, act) => {
        const spy = vi.spyOn(bridge.update, call).mockResolvedValue(success({}));

        act();

        expect(spy).toHaveBeenCalledTimes(1);
    });
});
