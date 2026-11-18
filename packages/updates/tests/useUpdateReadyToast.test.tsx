import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateStatus } from '../src/components/status/UpdateStatus.js';
import { updateStore } from '../src/update-store.js';

import { AppProviders } from './support/app-providers.js';
import { setUpdateState } from './support/update-states.js';

const TITLE = 'A new version is ready';

beforeEach(() => {
    vi.restoreAllMocks();
    updateStore.getState().reset();
});

afterEach(() => {
    cleanup();
});

function ready(version: string): void {
    act(() => {
        setUpdateState({ phase: 'ready', next: { version } });
    });
}

describe('the toast of a version that is ready', () => {
    it('shows up when the version becomes ready, saying which one', () => {
        render(<UpdateStatus />, { wrapper: AppProviders });
        ready('0.2.0');

        expect(screen.getByText(TITLE)).toBeVisible();
        expect(screen.getByText('Version 0.2.0 is installed when you restart.')).toBeVisible();
    });

    it('is not raised again for the same version, however often main repeats it', () => {
        render(<UpdateStatus />, { wrapper: AppProviders });
        ready('0.2.0');
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        ready('0.2.0');
        act(() => {
            setUpdateState({ phase: 'ready', next: { version: '0.2.0' }, current: '0.1.1' });
        });

        expect(screen.queryByText(TITLE)).toBeNull();
    });

    it('is raised again for a newer version', () => {
        render(<UpdateStatus />, { wrapper: AppProviders });
        ready('0.2.0');
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        ready('0.3.0');

        expect(screen.getByText(TITLE)).toBeVisible();
    });

    it('restarts the app from the action it carries', () => {
        const install = vi.spyOn(bridge.update, 'install').mockResolvedValue(success({}));

        render(<UpdateStatus />, { wrapper: AppProviders });
        ready('0.2.0');
        fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

        expect(install).toHaveBeenCalledTimes(1);
    });

    it('stays quiet while the version is only found or coming down', () => {
        render(<UpdateStatus />, { wrapper: AppProviders });
        act(() => {
            setUpdateState({ phase: 'downloading', next: { version: '0.2.0' }, progress: 10 });
        });

        expect(screen.queryByText(TITLE)).toBeNull();
    });
});
