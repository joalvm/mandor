import { failure, success, type Result, type UpdateState } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInstallChannel } from '../../src/hooks/useInstallChannel.js';
import { PreferencesProvider, usePreferences } from '../../src/preferences-context.js';
import { readAppPreferences, writeAppPreferences } from '../../src/preferences-storage.js';

function runningOn(current: string): Result<UpdateState> {
    return success({ phase: 'idle', support: 'full', current });
}

/** Mounts the window on what main answers, and waits for the answer to land. */
async function channelOn(answer: Result<UpdateState>) {
    const state = vi.spyOn(bridge.update, 'state').mockResolvedValue(answer);
    const view = renderHook(
        () => {
            const { values, writePreference } = usePreferences();

            useInstallChannel(writePreference);

            return values['updates.channel'];
        },
        { wrapper: PreferencesProvider },
    );

    await waitFor(() => {
        expect(state).toHaveBeenCalled();
    });
    await act(() => Promise.resolve());

    return view.result;
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('the channel an install starts on', () => {
    /** Written once, so the stable that reaches a beta later keeps it on the betas. */
    it('is the beta for an install of a beta that never chose one, and it is kept', async () => {
        const channel = await channelOn(runningOn('0.1.0-beta.1'));

        expect(channel.current).toBe('beta');
        expect(readAppPreferences()['updates.channel']).toBe('beta');
    });

    it('is the one the person chose, on a beta too', async () => {
        writeAppPreferences({ 'updates.channel': 'stable' });

        const channel = await channelOn(runningOn('0.1.0-beta.1'));

        expect(channel.current).toBe('stable');
    });

    it('is the stable for an install of a stable, with nothing written for it', async () => {
        const channel = await channelOn(runningOn('0.1.0'));

        expect(channel.current).toBe('stable');
        expect(readAppPreferences()).toEqual({});
    });

    it('is left to the default when main cannot say which version runs', async () => {
        const channel = await channelOn(failure('unknown', 'no answer'));

        expect(channel.current).toBe('stable');
        expect(readAppPreferences()).toEqual({});
    });
});
