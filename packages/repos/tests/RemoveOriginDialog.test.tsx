import { MessagesProvider } from '@mandor/i18n';
import { createOrigin } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RemoveOriginDialog } from '../src/components/dialog/RemoveOriginDialog.js';

const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the remove origin dialog', () => {
    it('unlocks only when the name is typed by hand', async () => {
        const onConfirm = vi.fn();

        render(<RemoveOriginDialog onCancel={vi.fn()} onConfirm={onConfirm} origin={TEAM} />, {
            wrapper: Wrapper,
        });
        const dialog = await screen.findByRole('alertdialog', { name: 'Remove Team?' });
        const confirm = within(dialog).getByRole('button', { name: 'Remove Team' });

        expect(confirm).toBeDisabled();

        const box = within(dialog).getByRole('textbox', { name: 'Team' });

        box.textContent = 'Team';
        fireEvent.input(box);
        fireEvent.click(confirm);

        expect(onConfirm).toHaveBeenCalledWith(TEAM);
    });

    it('stays shut while there is nothing to ask about', () => {
        render(<RemoveOriginDialog onCancel={vi.fn()} onConfirm={vi.fn()} origin={null} />, {
            wrapper: Wrapper,
        });

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
});
