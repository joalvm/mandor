import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceRow } from '../src/components/panel/WorkspaceRow.js';

const EVENTS = { id: 'events', kind: 'async' as const, name: 'Events', modifiedAt: null };

function row(overrides: Partial<Parameters<typeof WorkspaceRow>[0]> = {}): ReactNode {
    const props = {
        workspace: EVENTS,
        active: false,
        renaming: false,
        onRenameRequest: vi.fn(),
        onRenameCommit: vi.fn(),
        onRenameCancel: vi.fn(),
        onDelete: vi.fn(),
        ...overrides,
    };

    return (
        <table>
            <tbody>
                <WorkspaceRow {...props} />
            </tbody>
        </table>
    );
}

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children} </TooltipProvider>
        </MessagesProvider>
    );
}

describe('one row of the workspace table', () => {
    /** Working in a workspace is the selector's business; the page only configures. */
    it('shows the name as reading, not as a way in', () => {
        render(row(), { wrapper: Wrapper });

        expect(screen.getByRole('cell', { name: 'Events' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Events' })).toBeNull();
    });

    /** A workspace no commit has touched yet says so with a dash, not with a date that guesses. */
    it('marks the row of the open workspace as the one that is selected', () => {
        render(row({ active: true }), { wrapper: Wrapper });

        expect(screen.getByRole('row', { name: /Events/ })).toHaveAttribute('data-active', 'true');
    });

    it('keeps its date column empty when nothing touched the workspace', () => {
        render(row(), { wrapper: Wrapper });

        expect(screen.getByText('—')).toBeVisible();
    });
});
