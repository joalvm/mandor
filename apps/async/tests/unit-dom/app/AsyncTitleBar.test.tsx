import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import type * as Repos from '@mandor/repos';
import type * as Workspace from '@mandor/workspace';
import { describe, expect, it, vi } from 'vitest';

import { AsyncTitleBar } from '../../../src/renderer/app/AsyncTitleBar.js';

// What the two menus list is the business of the packages that own them. They are doubled so
// what is asserted here is the wiring of the row, not what either of them shows.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return {
        ...repos,
        OriginMenu: ({
            onManage,
            onSwitch,
        }: {
            onManage: () => void;
            onSwitch: (id: string) => void;
        }) => (
            <>
                <button onClick={onManage} type="button">
                    Orígenes
                </button>
                <button
                    onClick={() => {
                        onSwitch('demo');
                    }}
                    type="button"
                >
                    Cambiar de origen
                </button>
            </>
        ),
        useOriginBoot: () => undefined,
    };
});
vi.mock('@mandor/workspace', async () => {
    const workspace = await vi.importActual<typeof Workspace>('@mandor/workspace');

    return {
        ...workspace,
        WorkspaceMenu: ({ onManage }: { onManage: () => void }) => (
            <button onClick={onManage} type="button">
                Workspaces
            </button>
        ),
    };
});

function draw() {
    const onManageOrigins = vi.fn();
    const onManageWorkspaces = vi.fn();
    const onOpenSettings = vi.fn();
    const onSwitchOrigin = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <AsyncTitleBar
                    onManageOrigins={onManageOrigins}
                    onManageWorkspaces={onManageWorkspaces}
                    onOpenSettings={onOpenSettings}
                    onSwitchOrigin={onSwitchOrigin}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { onManageOrigins, onManageWorkspaces, onOpenSettings, onSwitchOrigin };
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

describe('the top row of Mandor Realtime', () => {
    it('reads icon and menu, origin and workspace, the room of the search, then environments, settings and the window', () => {
        draw();

        const order = readingOrder({
            icon: byPart('app-icon'),
            menu: screen.getByRole('button', { name: 'Menú de la aplicación' }),
            origin: screen.getByRole('button', { name: 'Orígenes' }),
            workspace: screen.getByRole('button', { name: 'Workspaces' }),
            search: byPart('title-search'),
            environment: screen.getByRole('button', { name: 'Administrar entornos' }),
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
    });

    /** The search arrives later; until then its place is held open and draws nothing. */
    it('keeps the room of the search empty', () => {
        draw();

        expect(byPart('title-search')).toContainElement(
            screen.getByRole('button', { name: 'Buscar comandos' }),
        );
    });

    it('stands the command centre on the middle of the window, between two halves of one weight', () => {
        draw();

        // Both ends grow from nothing by the same share, and the end keeps on its inner side the
        // air the row opens with, so what is left between them is the middle of the window.
        expect(byPart('title-start')).toHaveClass('flex-1', 'basis-0');
        expect(byPart('title-end')).toHaveClass('flex-1', 'basis-0', 'pl-pad-panel');
        // The end is as tall as the row, so the window buttons it holds reach top and bottom.
        expect(byPart('title-end')).toHaveClass('h-full');
        expect(byPart('titlebar')).toHaveClass('pl-pad-panel');
        expect(byPart('title-start')).not.toHaveClass('pl-pad-panel');
    });

    it('opens the settings from the gear at the far end', () => {
        const { onOpenSettings } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));

        expect(onOpenSettings).toHaveBeenCalledOnce();
    });

    it('hands origin and workspace administration to the menus it hosts', () => {
        const { onManageOrigins, onManageWorkspaces, onSwitchOrigin } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Orígenes' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cambiar de origen' }));
        fireEvent.click(screen.getByRole('button', { name: 'Workspaces' }));

        expect(onManageOrigins).toHaveBeenCalledOnce();
        expect(onSwitchOrigin).toHaveBeenCalledWith('demo');
        expect(onManageWorkspaces).toHaveBeenCalledOnce();
    });
});
