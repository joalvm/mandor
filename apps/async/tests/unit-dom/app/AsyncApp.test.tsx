import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import type * as Repos from '@mandor/repos';
import { selectActiveTabId, shellStore } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { splitAndRestore } from '@mandor/shell/testing/grid';
import { useToast } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import type * as Workspace from '@mandor/workspace';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncApp } from '../../../src/renderer/app/AsyncApp.js';

// Opening the origin is what the window does first and what this file is least about: the boot
// belongs to the package that owns the origins, and it is tested there. The two menus of the
// title bar are doubled so what is asserted is the composition, not what either of them lists.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return {
        ...repos,
        OriginMenu: () => <button type="button">Local</button>,
        useOriginBoot: () => undefined,
    };
});
vi.mock('@mandor/workspace', async () => {
    const workspace = await vi.importActual<typeof Workspace>('@mandor/workspace');

    return {
        ...workspace,
        WorkspaceMenu: ({ onManage }: { onManage: () => void }) => (
            <button onClick={onManage} type="button">
                Personal
            </button>
        ),
    };
});

let unregister: () => void;

function NoticeHarness() {
    const { notify } = useToast();

    return (
        <div>
            Panel vivo
            <button
                onClick={() => {
                    notify({ title: 'No se pudo guardar', tone: 'error' });
                }}
                type="button"
            >
                Avisar
            </button>
        </div>
    );
}

/** The window loads its data as it opens; the flush lets those loads land inside act. */
async function renderApp() {
    const view = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <AsyncApp />
        </MessagesProvider>,
    );

    await act(() => Promise.resolve());

    return view;
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'gateway',
        kind: 'test',
        resource: 'mandor://demo/payments/connection/gateway',
    });
    unregister = declareTabKindSpec({
        closable: false,
        icon: 'connection',
        id: 'test',
        body: <NoticeHarness />,
        title: () => 'Gateway',
    });
});

afterEach(() => {
    // The window comes down before its kinds do: a tab left drawn over a kind that is no
    // longer registered has nothing to render itself with.
    cleanup();
    unregister();
    shellStore.getState().reset();
});

describe('the async application', () => {
    it('composes the five zones of the window', async () => {
        await renderApp();

        expect(screen.getByRole('button', { name: 'Personal' })).toBeVisible();
        // The environments are managed beside the origin; the strip of tabs holds only tabs.
        expect(
            within(byPart('titlebar')).getByRole('button', { name: 'Administrar entornos' }),
        ).toBeVisible();
        expect(byPart('group-grid')).not.toHaveTextContent('Sin entorno');
        expect(screen.getByRole('button', { name: 'Configuración' })).toBeVisible();
        expect(byPart('sidebar')).toHaveTextContent('Colecciones');
        expect(screen.getByRole('tab', { name: 'Gateway' })).toBeVisible();
        expect(screen.getByRole('region', { name: 'Gateway' })).toHaveTextContent('Panel vivo');
        expect(byPart('status-line')).toHaveTextContent('Listo');
    });

    /** The lateral is the collection: what administers the workspaces is a tab in the centre. */
    it('keeps workspace administration out of the lateral', async () => {
        await renderApp();

        expect(byPart('sidebar')).not.toHaveTextContent('Workspaces');
        expect(screen.queryByRole('heading', { name: 'Workspaces' })).toBeNull();
    });

    it('opens the workspaces tab from the title bar', async () => {
        await renderApp();
        fireEvent.click(screen.getByRole('button', { name: 'Personal' }));

        expect(selectActiveTabId(shellStore.getState())).toBe('workspaces');
        expect(screen.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    });

    /** The grid is of shell, so it answers the same under either window. */
    it('splits the grid and restores it', async () => {
        await renderApp();

        expect(splitAndRestore(act)).toEqual([2, 1]);
    });

    /** The path of the origin is a detail of main: the status bar has nothing to say about it. */
    it('writes no path in the status bar', async () => {
        await renderApp();

        expect(byPart('status-line').querySelector('.font-mono')).toBeNull();
    });

    it('provides the shared toast channel to feature tabs', async () => {
        await renderApp();

        fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));

        expect(byPart('toast')).toHaveTextContent('No se pudo guardar');
        // The window keeps what the toast shows: closing the toast does not lose the failure.
        expect(shellStore.getState().notices.map((notice) => notice.title)).toEqual([
            'No se pudo guardar',
        ]);
    });
});
