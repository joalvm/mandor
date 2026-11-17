import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore, StatusLine } from '@mandor/shell';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdatesStatus } from '../src/UpdatesStatus.js';
import { updateStore } from '../src/update-store.js';

import { AppProviders } from './support/app-providers.js';
import { stateWith } from './support/update-states.js';

const fake = bridge as FakeBridge;

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    updateStore.getState().reset();
});

afterEach(() => {
    cleanup();
});

describe('the updates of a window', () => {
    it('hangs the status and the listening while mounted, and takes them down together', () => {
        vi.spyOn(bridge.update, 'state').mockResolvedValue(success(stateWith({})));

        const view = render(
            <>
                <UpdatesStatus />
                <StatusLine />
            </>,
            { wrapper: AppProviders },
        );

        act(() => {
            fake.emitUpdate(stateWith({ phase: 'ready', next: { version: '0.2.0' } }));
        });

        expect(screen.getByRole('button', { name: 'Restart to update' })).toBeVisible();

        view.rerender(<StatusLine />);
        act(() => {
            fake.emitUpdate(stateWith({ phase: 'checking' }));
        });

        expect(updateStore.getState().state?.phase).toBe('ready');
        expect(screen.queryByRole('button', { name: 'Restart to update' })).toBeNull();
    });
});
