import { MessagesProvider } from '@mandor/i18n';
import { createOrigin } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OriginConfirmDialog } from '../src/components/dialog/OriginConfirmDialog.js';

const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the question asked before something irreversible is done to an origin', () => {
    it('words the question of emptying with the name of the origin', async () => {
        render(
            <OriginConfirmDialog
                action="empty"
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
                origin={TEAM}
            />,
            { wrapper: Wrapper },
        );

        expect(await screen.findByRole('alertdialog', { name: 'Empty Team?' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Empty Team' })).toBeDisabled();
    });

    it('words the question of removing with the name of the origin', async () => {
        render(
            <OriginConfirmDialog
                action="remove"
                onCancel={vi.fn()}
                onConfirm={vi.fn()}
                origin={TEAM}
            />,
            { wrapper: Wrapper },
        );

        expect(await screen.findByRole('alertdialog', { name: 'Remove Team?' })).toBeVisible();
    });
});
