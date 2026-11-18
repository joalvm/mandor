import { MessagesProvider } from '@mandor/i18n';
import { createOrigin } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmptyOriginDialog } from '../src/components/dialog/EmptyOriginDialog.js';

const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(() => {
    cleanup();
});

describe('the empty origin dialog', () => {
    it('stays shut while there is nothing to ask about', () => {
        render(<EmptyOriginDialog onCancel={vi.fn()} onConfirm={vi.fn()} origin={null} />, {
            wrapper: Wrapper,
        });

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    /** Emptying cannot be undone: the name typed by hand is the only key. */
    it('unlocks only when the name is typed by hand', async () => {
        const onConfirm = vi.fn();

        render(<EmptyOriginDialog onCancel={vi.fn()} onConfirm={onConfirm} origin={TEAM} />, {
            wrapper: Wrapper,
        });

        const dialog = await screen.findByRole('alertdialog', { name: 'Empty Team?' });
        const confirm = within(dialog).getByRole('button', { name: 'Empty Team' });

        expect(confirm).toBeDisabled();

        const box = within(dialog).getByRole('textbox', { name: 'Team' });

        box.textContent = 'Team';
        fireEvent.input(box);
        fireEvent.click(confirm);

        expect(onConfirm).toHaveBeenCalledWith(TEAM);
    });

    it('does not confirm when it is cancelled', async () => {
        const onCancel = vi.fn();
        const onConfirm = vi.fn();

        render(<EmptyOriginDialog onCancel={onCancel} onConfirm={onConfirm} origin={TEAM} />, {
            wrapper: Wrapper,
        });

        const dialog = await screen.findByRole('alertdialog', { name: 'Empty Team?' });

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
