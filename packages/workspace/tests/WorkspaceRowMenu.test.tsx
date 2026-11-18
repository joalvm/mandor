import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceRowMenu } from '../src/components/menu/WorkspaceRowMenu.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children} </TooltipProvider>
        </MessagesProvider>
    );
}

function open(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Workspace options' }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

describe('the menu of one workspace row', () => {
    it('renames in place and deletes by asking first', () => {
        const onRename = vi.fn();
        const onDelete = vi.fn();

        render(<WorkspaceRowMenu onDelete={onDelete} onRename={onRename} />, {
            wrapper: Wrapper,
        });
        open();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
        open();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

        expect(onRename).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
});
