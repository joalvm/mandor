import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceDeleteDialog } from '../src/components/dialog/WorkspaceDeleteDialog.js';

const EVENTS = { id: 'events', kind: 'async' as const, name: 'Events', modifiedAt: null };

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children} </TooltipProvider>
        </MessagesProvider>
    );
}

describe('the delete workspace dialog', () => {
    it('names the exact workspace and hands it over only on the destructive answer', async () => {
        const onConfirm = vi.fn();

        render(
            <WorkspaceDeleteDialog onCancel={vi.fn()} onConfirm={onConfirm} workspace={EVENTS} />,
            { wrapper: Wrapper },
        );

        expect(await screen.findByRole('alertdialog', { name: 'Delete Events?' })).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(onConfirm).toHaveBeenCalledWith(EVENTS);
    });

    it('stays shut while there is nothing to ask about', () => {
        render(<WorkspaceDeleteDialog onCancel={vi.fn()} onConfirm={vi.fn()} workspace={null} />, {
            wrapper: Wrapper,
        });

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
});
