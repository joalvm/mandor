import { MessagesProvider } from '@mandor/i18n';
import { success, type UpdateState } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdatesRow } from '../src/components/dialog/UpdatesRow.js';

const fake = bridge as FakeBridge;

const IDLE: UpdateState = { phase: 'idle', support: 'full', current: '0.1.0' };

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    cleanup();
});

async function drawWith(state: UpdateState) {
    vi.spyOn(bridge.update, 'state').mockResolvedValue(success(state));
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <UpdatesRow />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return screen.findByText('Current version ' + state.current);
}

describe('the row of the version in the settings', () => {
    it('says which version runs and looks for a newer one when asked', async () => {
        const check = vi.spyOn(bridge.update, 'check').mockResolvedValue(success({}));

        await drawWith(IDLE);
        fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));

        expect(check).toHaveBeenCalledTimes(1);
    });

    it('cannot be pressed while a look or a download is under way, and follows main', async () => {
        await drawWith(IDLE);
        act(() => {
            fake.emitUpdate({ ...IDLE, phase: 'checking' });
        });

        expect(screen.getByRole('button', { name: 'Check for updates' })).toBeDisabled();

        act(() => {
            fake.emitUpdate({ ...IDLE, current: '0.1.1' });
        });

        expect(screen.getByText('Current version 0.1.1')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Check for updates' })).toBeEnabled();
    });

    it('cannot be pressed on an install that does not update from the app', async () => {
        await drawWith({ ...IDLE, support: 'unsupported' });

        expect(screen.getByRole('button', { name: 'Check for updates' })).toBeDisabled();
    });
});
