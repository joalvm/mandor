import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceActions } from '../src/components/panel/WorkspaceActions.js';
import { WorkspacePanelAction } from '../src/index.js';

/** The actions of the page, with whatever the app wrote beside them in the tree. */
function page(added: ReactNode) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                {added}
                <WorkspaceActions canCreate onNew={vi.fn()} />
            </TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(() => {
    cleanup();
});

describe('an action of the workspaces page declared in the tree', () => {
    /**
     * The registry outlives a file, and the place of an id is where it first arrived, ever: the
     * ids here are ones no other file declares, so the order is the one this test sets.
     */
    it('stands beside the way in while it is mounted, in the order it arrived', () => {
        const view = render(
            page(
                <>
                    <WorkspacePanelAction id="arrives-first">
                        <button type="button">Import</button>
                    </WorkspacePanelAction>
                    <WorkspacePanelAction id="arrives-second">
                        <button type="button">Export</button>
                    </WorkspacePanelAction>
                </>,
            ),
        );

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'New workspace',
            'Import',
            'Export',
        ]);

        view.rerender(page(null));

        expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
    });
});
