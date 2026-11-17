import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RunScriptsRow } from '../../../src/components/dialog/RunScriptsRow.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function drawRow() {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    <RunScriptsRow />
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>,
    );

    return screen.findByRole('switch', { name: 'Run scripts' });
}

describe('the switch that lets scripts run on this machine', () => {
    it('shows what main holds and tells main when it is turned, with no question asked', async () => {
        vi.spyOn(bridge.scripts, 'readSwitch').mockResolvedValue(success({ enabled: true }));
        const write = vi.spyOn(bridge.scripts, 'writeSwitch').mockResolvedValue(success({}));

        const pill = await drawRow();

        expect(pill).toBeChecked();

        fireEvent.click(pill);

        expect(write).toHaveBeenCalledWith(false);
        expect(pill).not.toBeChecked();
        expect(screen.queryByRole('alertdialog')).toBeNull();

        fireEvent.click(pill);

        expect(write).toHaveBeenLastCalledWith(true);
        expect(pill).toBeChecked();
    });

    it('starts off when main says scripts are off', async () => {
        vi.spyOn(bridge.scripts, 'readSwitch').mockResolvedValue(success({ enabled: false }));

        expect(await drawRow()).not.toBeChecked();
    });

    it('goes back to what main holds, and says so, when main refuses the change', async () => {
        vi.spyOn(bridge.scripts, 'readSwitch').mockResolvedValue(success({ enabled: true }));
        vi.spyOn(bridge.scripts, 'writeSwitch').mockResolvedValue(failure('fs-write', 'disk full'));

        const pill = await drawRow();

        fireEvent.click(pill);

        await waitFor(() => {
            expect(pill).toBeChecked();
        });
        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
    });
});
