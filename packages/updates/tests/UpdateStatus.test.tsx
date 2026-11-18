import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateStatus } from '../src/components/status/UpdateStatus.js';
import { updateStore } from '../src/update-store.js';

import { AppProviders } from './support/app-providers.js';
import { setUpdateState } from './support/update-states.js';

const NEXT = { version: '0.2.0' };

beforeEach(() => {
    vi.restoreAllMocks();
    updateStore.getState().reset();
});

afterEach(() => {
    cleanup();
});

function draw() {
    return render(<UpdateStatus />, { wrapper: AppProviders });
}

describe('the update in the status line', () => {
    it.each([
        ['nothing has been heard from main', undefined],
        ['the app is up to date', { phase: 'idle' }],
        ['a look is under way', { phase: 'checking' }],
        ['the look failed', { phase: 'error', error: 'request-unreachable' }],
        ['the install cannot update', { phase: 'ready', next: NEXT, support: 'unsupported' }],
    ] as const)('says nothing when %s', (_, patch) => {
        if (patch !== undefined) {
            setUpdateState(patch);
        }

        const { container } = draw();

        expect(container.querySelector('[data-part="update-status"]')).toBeNull();
    });

    it('tells the percent while a version comes down, and offers nothing to press', () => {
        setUpdateState({ phase: 'downloading', next: NEXT, progress: 42 });
        draw();

        expect(screen.getByText('Downloading update 42%')).toBeVisible();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers to take a version found when the person asked to be told first', () => {
        const download = vi.spyOn(bridge.update, 'download').mockResolvedValue(success({}));

        setUpdateState({ phase: 'available', next: NEXT });
        draw();

        expect(screen.getByText('New version 0.2.0')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Download' }));

        expect(download).toHaveBeenCalledTimes(1);
    });

    it('opens the page of the app where an install that cannot update takes a version', () => {
        const openPage = vi.spyOn(bridge.update, 'openPage').mockResolvedValue(success({}));

        setUpdateState({ phase: 'available', next: NEXT, support: 'manual-only' });
        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Get it' }));

        expect(openPage).toHaveBeenCalledTimes(1);
    });

    it('restarts the app to install a version that is ready', () => {
        const install = vi.spyOn(bridge.update, 'install').mockResolvedValue(success({}));

        setUpdateState({ phase: 'ready', next: NEXT });
        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Restart to update' }));

        expect(install).toHaveBeenCalledTimes(1);
    });

    it('follows the state as main changes it', () => {
        draw();
        act(() => {
            setUpdateState({ phase: 'ready', next: NEXT });
        });

        expect(screen.getByRole('button', { name: 'Restart to update' })).toBeVisible();
    });
});
