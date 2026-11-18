import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UnsavedChangesDialog, type TabSaveOutcome } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';
import { unsavedQuestion } from '../../../src/tab/unsaved-question.js';

const TAB = { id: 'login', kind: 'draft', resource: 'mandor://r/w/item/login' };

const UNDO: (() => void)[] = [];
const notified = vi.fn();

function Window({ children }: PropsWithChildren) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Cerrar aviso', more: (count) => `+${String(count)}` }}
                    onNotify={notified}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function declare(save?: () => Promise<TabSaveOutcome>): void {
    UNDO.push(
        declareTabKindSpec({
            closable: true,
            dirty: () => true,
            icon: 'send',
            id: 'draft',
            save,
            title: () => 'Login',
        }),
    );
}

function ask(): Promise<boolean> {
    const answer = unsavedQuestion.getState().ask(TAB);

    render(<UnsavedChangesDialog />, { wrapper: Window });

    return answer;
}

/** The dialog goes once the answer is given: the save, if any, has come back by then. */
async function answered(): Promise<void> {
    await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
}

afterEach(() => {
    cleanup();
    notified.mockClear();
    unsavedQuestion.setState({ asking: null });

    for (const undo of UNDO.splice(0)) {
        undo();
    }
});

describe('the question a tab with unsaved work asks as it closes', () => {
    it('names the tab and lets it go once its work is saved', async () => {
        const save = vi.fn().mockResolvedValue(null);

        declare(save);

        const answer = ask();

        expect(
            await screen.findByRole('alertdialog', { name: '¿Guardar los cambios de «Login»?' }),
        ).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await answered();

        await expect(answer).resolves.toBe(true);
        expect(save).toHaveBeenCalledWith('login', TAB.resource);
    });

    it('keeps the tab and says why when the save is refused', async () => {
        declare(vi.fn().mockResolvedValue('fs-write'));

        const answer = ask();

        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
        await answered();

        await expect(answer).resolves.toBe(false);
        expect(notified).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
    });

    it('keeps the tab and says nothing when the person stayed while saving', async () => {
        declare(vi.fn().mockResolvedValue('kept'));

        const answer = ask();

        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
        await answered();

        await expect(answer).resolves.toBe(false);
        expect(notified).not.toHaveBeenCalled();
    });

    /** A save that broke instead of answering must not leave the question saving for ever. */
    it('keeps the tab and says so when the save breaks', async () => {
        declare(vi.fn().mockRejectedValue(new Error('the window lost main')));

        const answer = ask();

        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
        await answered();

        await expect(answer).resolves.toBe(false);
        expect(notified).toHaveBeenCalledWith(expect.objectContaining({ tone: 'error' }));
    });

    it('lets the tab go without saving, or keeps it, as answered', async () => {
        declare(vi.fn());

        const discarded = ask();

        fireEvent.click(await screen.findByRole('button', { name: 'No guardar' }));
        await answered();

        await expect(discarded).resolves.toBe(true);

        let kept: Promise<boolean> = Promise.resolve(true);

        act(() => {
            kept = unsavedQuestion.getState().ask(TAB);
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
        await answered();

        await expect(kept).resolves.toBe(false);
    });

    it('offers no save for a kind that cannot save', async () => {
        declare();
        void ask();

        await screen.findByRole('alertdialog');

        expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();
    });
});
