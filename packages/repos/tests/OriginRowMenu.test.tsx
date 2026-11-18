import { MessagesProvider } from '@mandor/i18n';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OriginRowMenu } from '../src/components/menu/OriginRowMenu.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function open(origin = TEAM): void {
    render(
        <OriginRowMenu
            onCheck={vi.fn()}
            onEmpty={vi.fn()}
            onRemove={vi.fn()}
            onRename={vi.fn()}
            origin={origin}
        />,
        { wrapper: Wrapper },
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Origins actions' }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
}

describe('the menu of one origin row (OriginRowMenu)', () => {
    it('offers everything to a remote origin: rename, check, empty, remove', () => {
        open(TEAM);

        expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Check connection' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Empty' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Remove from list' })).toBeVisible();
    });

    it('offers the local origin no rename, no check and no removal', () => {
        open(LOCAL);

        expect(screen.queryByRole('menuitem', { name: 'Rename' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'Check connection' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'Remove from list' })).toBeNull();
        expect(screen.getByRole('menuitem', { name: 'Empty' })).toBeVisible();
    });
});
