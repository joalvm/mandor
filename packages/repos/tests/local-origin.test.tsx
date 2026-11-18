import { MessagesProvider } from '@mandor/i18n';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { registerShellCommands, registeredCommands, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OriginMenu } from '../src/index.js';
import { OriginsPanel } from '../src/components/panel/OriginsPanel.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count: number) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function removeAffordances(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[role="menuitem"], button')].filter((control) =>
        /remove|rename|delete/i.test(control.textContent),
    );
}

beforeEach(async () => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([LOCAL, TEAM]);
    await act(() => shellStore.getState().loadSession(LOCAL.id));
});

describe('the local origin', () => {
    it('has no path to be removed: not the menu, not the tab, not the palette', async () => {
        const menu = render(<OriginMenu onManage={vi.fn()} onSwitch={vi.fn()} />, {
            wrapper: Wrapper,
        });

        fireEvent.pointerDown(screen.getByRole('button', { name: /Local/ }), {
            button: 0,
            ctrlKey: false,
            pointerType: 'mouse',
        });

        expect(removeAffordances(document.body)).toEqual([]);

        fireEvent.keyDown(document.body, { key: 'Escape' });
        menu.unmount();

        const panel = render(<OriginsPanel onSwitch={vi.fn()} />, { wrapper: Wrapper });

        // The panel lists and checks as it opens; the flush lands those answers inside act.
        await act(() => Promise.resolve());

        await screen.findByText('Local');
        expect(removeAffordances(panel.container)).toEqual([]);
        panel.unmount();

        const undo = registerShellCommands();
        const originCommands = registeredCommands().filter((command) => /origin/i.test(command.id));

        expect(originCommands.map((command) => command.id)).toEqual(['shell.openOrigins']);
        undo();
    });

    it('keeps its first place in the management list', async () => {
        render(<OriginsPanel onSwitch={vi.fn()} />, { wrapper: Wrapper });
        await act(() => Promise.resolve());

        const rows = screen.getAllByRole('row');
        const first = rows[1];

        if (first === undefined) {
            throw new Error('the table came up empty');
        }

        expect(within(first).getByText('Local')).toBeVisible();
    });
});
