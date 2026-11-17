import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { bridge, createPendingWrites } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ForgetApprovalsRow } from '../../../src/components/dialog/ForgetApprovalsRow.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function drawRow(): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    <ForgetApprovalsRow />
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>,
    );
}

function forgetAndConfirm(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Forget approvals' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forget' }));
}

describe('the row that forgets every approval of this machine', () => {
    it('asks first, and forgets nothing when the question is turned down', () => {
        const forget = vi.spyOn(bridge.scripts, 'forget');

        drawRow();
        fireEvent.click(screen.getByRole('button', { name: 'Forget approvals' }));

        expect(screen.getByRole('alertdialog', { name: 'Forget every approval?' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(forget).not.toHaveBeenCalled();
    });

    /** An approval still waiting for its pause reaches main first, and goes with the others. */
    it('settles what still waits for its pause before main forgets', async () => {
        const order: string[] = [];
        const waiting = createPendingWrites<string, string>((_key, source) => {
            order.push(`approve ${source}`);

            return Promise.resolve();
        }, 60_000);

        vi.spyOn(bridge.scripts, 'forget').mockImplementation(() => {
            order.push('forget');

            return Promise.resolve(success({}));
        });
        waiting.schedule('pagos/onResponse', 'pm.test()');
        drawRow();
        forgetAndConfirm();

        await waitFor(() => {
            expect(order).toEqual(['approve pm.test()', 'forget']);
        });
    });

    it('says so when main could not forget', async () => {
        vi.spyOn(bridge.scripts, 'forget').mockResolvedValue(failure('fs-write', 'disk full'));

        drawRow();
        forgetAndConfirm();

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
    });
});
