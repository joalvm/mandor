import { MessagesProvider } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncTitleBar } from '../../../src/renderer/app/SyncTitleBar.js';

const ORIGINS = [
    { id: 'local', name: 'Local', kind: 'local' as const },
    { id: 'server', name: 'Servidor', kind: 'remote' as const, url: 'https://github.com/demo' },
];

function renderTitleBar(
    onSwitchOrigin: (id: string) => void = () => undefined,
    onOpenSettings: () => void = () => undefined,
) {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <SyncTitleBar
                    onManageOrigins={() => undefined}
                    onManageWorkspaces={() => undefined}
                    onOpenSettings={onOpenSettings}
                    onSwitchOrigin={onSwitchOrigin}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openMenu(label: string | RegExp): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: label }), {
        button: 0,
        ctrlKey: false,
    });
}

/** The names of the pieces, sorted by where each one stands in the row. */
function readingOrder(pieces: Record<string, Element>): string[] {
    return Object.entries(pieces)
        .sort(([, first], [, second]) =>
            (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) === 0
                ? 1
                : -1,
        )
        .map(([name]) => name);
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins(ORIGINS);
    // No workspace open: the environment picker has nothing to load, so nothing lands after act.
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: null });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('SyncTitleBar', () => {
    it('draws the origin, the workspace and the window controls on the top row', () => {
        renderTitleBar();

        expect(byPart('titlebar')).toBeVisible();
        expect(byPart('titlebar')).toHaveTextContent('Local');
        expect(screen.getByRole('button', { name: 'Menú de la aplicación' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sin workspace' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Minimizar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Maximizar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar ventana' })).toBeInTheDocument();
    });

    it('reads icon and menu, origin and workspace, the search, then environment, settings and the window', () => {
        renderTitleBar();

        const order = readingOrder({
            icon: byPart('app-icon'),
            menu: screen.getByRole('button', { name: 'Menú de la aplicación' }),
            origin: screen.getByRole('button', { name: /Local/ }),
            workspace: screen.getByRole('button', { name: 'Sin workspace' }),
            search: byPart('title-search'),
            environment: screen.getByRole('button', { name: /Sin entorno/ }),
            settings: screen.getByRole('button', { name: 'Configuración' }),
            window: byPart('window-controls'),
        });

        expect(order).toEqual([
            'icon',
            'menu',
            'origin',
            'workspace',
            'search',
            'environment',
            'settings',
            'window',
        ]);
        expect(byPart('title-search')).toContainElement(
            screen.getByRole('button', { name: 'Buscar comandos' }),
        );
    });

    it('stands the command centre on the middle of the window, between two halves of one weight', () => {
        renderTitleBar();

        // Both ends grow from nothing by the same share, and the end keeps on its inner side the
        // air the row opens with, so what is left between them is the middle of the window.
        expect(byPart('title-start')).toHaveClass('flex-1', 'basis-0');
        expect(byPart('title-end')).toHaveClass('flex-1', 'basis-0', 'pl-pad-panel');
        // The end is as tall as the row, so the window buttons it holds reach top and bottom.
        expect(byPart('title-end')).toHaveClass('h-full');
        expect(byPart('titlebar')).toHaveClass('pl-pad-panel');
        expect(byPart('title-start')).not.toHaveClass('pl-pad-panel');
    });

    it('opens the settings from the button of the row', () => {
        const onOpenSettings = vi.fn();

        renderTitleBar(undefined, onOpenSettings);
        fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));

        expect(onOpenSettings).toHaveBeenCalledOnce();
    });

    it('hands the origin the user chose over to the app', async () => {
        const onSwitchOrigin = vi.fn();

        renderTitleBar(onSwitchOrigin);

        openMenu(/Local/);
        fireEvent.click(await screen.findByRole('menuitem', { name: /Servidor/ }));

        expect(onSwitchOrigin).toHaveBeenCalledOnce();
        expect(onSwitchOrigin).toHaveBeenCalledWith('server');
    });

    it('keeps the choice to itself when the origin chosen is the one already active', async () => {
        const onSwitchOrigin = vi.fn();

        renderTitleBar(onSwitchOrigin);

        openMenu(/Local/);
        fireEvent.click(await screen.findByRole('menuitem', { name: /Local/ }));

        expect(onSwitchOrigin).not.toHaveBeenCalled();
    });
});
