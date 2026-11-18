import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceEnvironment } from '../../../src/renderer/environment/useWorkspaceEnvironment.js';

const local = createEnvironment({ id: 'local', name: 'Local' });
const staging = createEnvironment({ id: 'staging', name: 'Staging' });

/** What the workspace has active on disk, as the read brings it. */
let activeOnDisk: Record<string, string> = {};

/** The hook reads the workspace as it mounts: let that read land inside act. */
async function mounted() {
    const shown = renderHook(() => useWorkspaceEnvironment());

    await act(async () => {
        await Promise.resolve();
    });

    return shown;
}

beforeEach(() => {
    vi.restoreAllMocks();
    activeOnDisk = { personal: 'staging' };
    vi.spyOn(window.mandor.environment, 'list').mockResolvedValue(success([local, staging]));
    vi.spyOn(window.mandor.environment, 'loadActive').mockImplementation(() =>
        Promise.resolve(success(activeOnDisk)),
    );
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
});

afterEach(() => {
    cleanup();
    envStore.getState().reset();
    shellStore.getState().reset();
});

describe('the environment of the workspace', () => {
    it('offers the environments the workspace has', async () => {
        const { result } = await mounted();

        expect(result.current.options.map((each) => each.id)).toEqual(['local', 'staging']);
    });

    it('is the one the workspace has active', async () => {
        const { result } = await mounted();

        expect(result.current.value).toBe('staging');
    });

    it('is none when the workspace has not chosen one', async () => {
        activeOnDisk = {};

        const { result } = await mounted();

        expect(result.current.value).toBeNull();
    });

    it('writes the choice on the workspace', async () => {
        const saveActive = vi
            .spyOn(window.mandor.environment, 'saveActive')
            .mockResolvedValue(success({}));
        const { result } = await mounted();

        await act(async () => {
            result.current.onChange('local');
            await Promise.resolve();
        });

        expect(saveActive).toHaveBeenCalledWith({
            environmentId: 'local',
            workspaceId: 'personal',
        });
    });

    it('has no workspace to write in while none is open', async () => {
        const saveActive = vi
            .spyOn(window.mandor.environment, 'saveActive')
            .mockResolvedValue(success({}));

        shellStore.setState({ activeWorkspaceId: null });

        const { result } = await mounted();

        await act(async () => {
            result.current.onChange('local');
            await Promise.resolve();
        });

        expect(result.current.value).toBeNull();
        expect(saveActive).not.toHaveBeenCalled();
    });
});
