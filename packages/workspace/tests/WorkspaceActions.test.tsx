import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceActions } from '../src/components/panel/WorkspaceActions.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the actions of the workspaces page (WorkspaceActions)', () => {
    it('opens the dialog that creates one', () => {
        const onNew = vi.fn();

        render(<WorkspaceActions canCreate onNew={onNew} />, { wrapper: Wrapper });
        fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));

        expect(onNew).toHaveBeenCalled();
    });

    it('keeps the way in waiting while no origin is in use', () => {
        render(<WorkspaceActions canCreate={false} onNew={vi.fn()} />, { wrapper: Wrapper });

        expect(screen.getByRole('button', { name: 'New workspace' })).toBeDisabled();
    });
});
