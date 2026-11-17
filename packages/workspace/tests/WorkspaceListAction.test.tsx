import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceActions } from '../src/components/panel/WorkspaceActions.js';
import { workspaceListActionDeclarations } from '../src/list-actions.js';
import { WorkspaceListAction, WorkspacePanelAction } from '../src/index.js';

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

describe('an action that makes a workspace, declared in the tree', () => {
    it('stands beside the way in while it is mounted, and leaves with its declaration', () => {
        const view = render(
            page(
                <WorkspaceListAction id="import">
                    <button type="button">Import</button>
                </WorkspaceListAction>,
            ),
        );

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'New workspace',
            'Import',
        ]);
        expect(workspaceListActionDeclarations.list().map((action) => action.id)).toEqual([
            'import',
        ]);

        view.rerender(page(null));

        expect(screen.queryByRole('button', { name: 'Import' })).toBeNull();
        expect(workspaceListActionDeclarations.list()).toEqual([]);
    });

    it('stands before the actions of the panel, which belong to the workspace that is open', () => {
        render(
            page(
                <>
                    <WorkspacePanelAction id="duplicate">
                        <button type="button">Duplicate</button>
                    </WorkspacePanelAction>
                    <WorkspaceListAction id="import">
                        <button type="button">Import</button>
                    </WorkspaceListAction>
                </>,
            ),
        );

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'New workspace',
            'Import',
            'Duplicate',
        ]);
    });
});
