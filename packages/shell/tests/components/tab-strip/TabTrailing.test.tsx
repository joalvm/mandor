import { fireEvent, render, screen } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
    TabTrailing,
    type TabTrailingAction,
} from '../../../src/components/tab-strip/TabTrailing.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function closing(run: () => void = vi.fn()): TabTrailingAction {
    return { icon: 'close', label: 'Cerrar pestaña', rests: false, run };
}

function show(input: { action?: TabTrailingAction | undefined; status?: ReactNode }): void {
    render(
        <TabTrailing action={'action' in input ? input.action : closing()}>
            {input.status ?? null}
        </TabTrailing>,
        { wrapper: Wrapper },
    );
}

function trailingOf(label: string): HTMLElement | null {
    return screen.getByRole('button', { name: label }).closest('[data-part="tab-trailing"]');
}

/**
 * What comes after the name of a tab: one place at its far edge, over the name. Nothing about
 * the tab moves when the pointer arrives: what the state says and what the close offers stand
 * one over the other instead of one beside the other.
 */
describe('the end of a tab', () => {
    it('holds the state of the thing and the close in the same place', () => {
        show({ status: <span role="img" aria-label="Conectado" /> });

        expect(screen.getByRole('img', { name: 'Conectado' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar pestaña' })).toBeInTheDocument();
    });

    it('offers nothing where a kind neither closes nor says a state', () => {
        show({ action: undefined });

        expect(screen.queryByRole('button', { name: 'Cerrar pestaña' })).toBeNull();
    });

    it('keeps the state of a kind that does not close', () => {
        show({ action: undefined, status: <span role="img" aria-label="Conectado" /> });

        expect(screen.getByRole('img', { name: 'Conectado' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cerrar pestaña' })).toBeNull();
    });

    /** The tab under the close is not what was asked for: closing is not choosing. */
    it('closes the tab without handing the click to the tab underneath', () => {
        const onClose = vi.fn();
        const onActivate = vi.fn();

        render(
            <div onClick={onActivate}>
                <TabTrailing action={closing(onClose)} />
            </div>,
            { wrapper: Wrapper },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar pestaña' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onActivate).not.toHaveBeenCalled();
    });

    /** The pin is what says the tab is pinned, so it stays drawn while nothing points at it. */
    it('keeps drawn an action that rests, and hides one that does not', () => {
        show({ action: { icon: 'pinned', label: 'Soltar pestaña', rests: true, run: vi.fn() } });
        show({});

        expect(screen.getByRole('button', { name: 'Soltar pestaña' })).toHaveClass('visible');
        expect(screen.getByRole('button', { name: 'Cerrar pestaña' })).toHaveClass('invisible');
    });

    /**
     * The dot and the close come up in the very same spot, one in place of the other: both lie in
     * the one cell of the place, so they share its centre.
     */
    it('lays the state and the close in one cell, the close only while aimed at', () => {
        show({ status: <span role="img" aria-label="Conectado" /> });

        const state = screen.getByRole('img', { name: 'Conectado' }).parentElement;
        const close = screen.getByRole('button', { name: 'Cerrar pestaña' });

        for (const piece of [state, close]) {
            expect(piece).toHaveClass('col-start-1', 'row-start-1');
        }

        expect(state).toHaveClass('group-hover:invisible');
        expect(close).toHaveClass('invisible', 'group-hover:visible');
    });

    /** A pinned tab with a state shows the state, and its pin again once the state is empty. */
    it('shows the pin when the state beside it draws nothing', () => {
        show({
            action: { icon: 'pinned', label: 'Soltar pestaña', rests: true, run: vi.fn() },
            status: <span role="img" aria-label="Conectado" />,
        });

        expect(screen.getByRole('button', { name: 'Soltar pestaña' })).toHaveClass(
            'invisible',
            'peer-empty:visible',
        );
    });

    /** The place lies over the end of the name: the tab keeps no room for it. */
    it('lies over the end of the tab instead of keeping a room beside the name', () => {
        show({});

        expect(trailingOf('Cerrar pestaña')).toHaveClass('absolute');
    });

    it('takes no place at all when it neither offers nor says anything', () => {
        const { container } = render(<TabTrailing />, { wrapper: Wrapper });

        expect(container.querySelector('[data-part="tab-trailing"]')).toBeNull();
    });
});
