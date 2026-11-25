import { SIDEBAR_WIDTH } from '@mandor/ipc';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { shellStore, StatusItem } from '../../../src/index.js';
import { StatusLine } from '../../../src/components/status-line/StatusLine.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <StatusLine />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the line of status', () => {
    it('carries the switch of the sidebar ahead of the status itself', () => {
        draw();

        const toggle = screen.getByRole('button', { name: 'Ocultar barra lateral' });
        const status = screen.getByText('Listo');

        expect(
            toggle.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it.each([
        [{ state: 'clean', busy: true }, 'Sincronizando…'],
        [{ state: 'error', busy: false }, 'No se pudo sincronizar'],
        [{ state: 'conflict', busy: false }, 'Hay conflictos'],
        [{ state: 'clean', busy: false }, 'Listo'],
        [{ state: 'local-only', busy: false }, 'Listo'],
    ] as const)('says in its own words where the origin stands: %j', (syncState, text) => {
        draw();
        act(() => {
            shellStore.getState().setSyncState(syncState);
        });

        const status = screen.getByRole('status');

        expect(status).toHaveTextContent(text);
        expect(status.textContent).not.toMatch(/git|commit|push|merge|rama|remoto|repositorio/i);
    });

    /** Each standing reads twice: by the tint of the pill and by the glyph before the words. */
    it.each([
        [{ state: 'clean', busy: true }, 'info', 'loading', true],
        [{ state: 'error', busy: false }, 'error', 'error', false],
        [{ state: 'conflict', busy: false }, 'warning', 'warning', false],
        [{ state: 'clean', busy: false }, 'success', 'check', false],
    ] as const)('tints the pill and picks its glyph: %j', (syncState, tone, glyph, spins) => {
        draw();
        act(() => {
            shellStore.getState().setSyncState(syncState);
        });

        const status = screen.getByRole('status');
        const mark = status.querySelector('[data-glyph]');

        expect(status.querySelector('[data-part="badge"]')).toHaveAttribute('data-tone', tone);
        expect(mark).toHaveAttribute('data-glyph', glyph);
        expect(mark?.hasAttribute('data-spin')).toBe(spins);
    });

    /** Hiding is a width of zero, and the width it had comes back with the lateral. */
    it('says what the switch would bring back, and hides the lateral on click', () => {
        draw();

        expect(screen.getByRole('button', { name: 'Ocultar barra lateral' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar barra lateral' }));

        expect(shellStore.getState().panels.sidebarWidth).toBe(0);
        expect(screen.getByRole('button', { name: 'Mostrar barra lateral' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar barra lateral' }));

        expect(shellStore.getState().panels.sidebarWidth).toBe(SIDEBAR_WIDTH.default);
    });

    /** The line does not know the pieces; whoever declares one is drawn after the status text. */
    it('draws the declared items to the right of the status, in their order', () => {
        render(
            <>
                <StatusItem id="second" order={20}>
                    <i>segundo</i>
                </StatusItem>
                <StatusItem id="first" order={10}>
                    <i>primero</i>
                </StatusItem>
            </>,
        );
        draw();

        const status = screen.getByText('Listo');
        const first = screen.getByText('primero');
        const second = screen.getByText('segundo');

        expect(
            status.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
            first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
