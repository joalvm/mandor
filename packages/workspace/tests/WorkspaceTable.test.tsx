import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceTable } from '../src/components/panel/WorkspaceTable.js';

const EVENTS = { id: 'events', kind: 'async' as const, name: 'Events', modifiedAt: null };
const ORDERS = {
    id: 'orders',
    kind: 'async' as const,
    name: 'Orders',
    modifiedAt: new Date().toISOString(),
};

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children} </TooltipProvider>
        </MessagesProvider>
    );
}

function table(): ReactNode {
    return (
        <WorkspaceTable
            activeWorkspaceId="events"
            onDelete={vi.fn()}
            onRenameCancel={vi.fn()}
            onRenameCommit={vi.fn()}
            onRenameRequest={vi.fn()}
            renamingId={null}
            workspaces={[EVENTS, ORDERS]}
        />
    );
}

describe('the table of workspaces', () => {
    it('names its columns and keeps the order the repo holds', () => {
        render(table(), { wrapper: Wrapper });

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Modified' })).toBeVisible();
        expect(screen.getAllByRole('row')).toHaveLength(3);
    });
});
