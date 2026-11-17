import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import type * as Repos from '@mandor/repos';
import { PreferencesProvider } from '@mandor/prefs';
import { selectTabs, shellStore } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { splitAndRestore } from '@mandor/shell/testing/grid';
import { useToast } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncApp } from '../../../src/renderer/app/SyncApp.js';

// Opening the origin is what the window does first and what these tests are least about: the
// boot belongs to the package that owns the origins, and it is tested there.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return { ...repos, useOriginBoot: () => undefined };
});

let stopFailing: () => void;

/** A tab whose only job is to fail out loud, so the window has an error to keep. */
function FailureButton() {
    const { notify } = useToast();

    return (
        <button
            onClick={() => {
                notify({ title: 'No se pudo guardar', tone: 'error' });
            }}
            type="button"
        >
            Fallar
        </button>
    );
}

/** The window loads its data as it opens; the flush lets those loads land inside act. */
async function renderApp() {
    const view = render(
        <PreferencesProvider>
            <MessagesProvider preferences={{ language: 'es' }}>
                <SyncApp />
            </MessagesProvider>
        </PreferencesProvider>,
    );

    await act(() => Promise.resolve());

    return view;
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
    stopFailing = declareTabKindSpec({
        closable: false,
        icon: 'connection',
        id: 'failing',
        body: <FailureButton />,
        title: () => 'Falla',
    });
});

afterEach(() => {
    // The window comes down before its kinds do: a tab left drawn over a kind that is no
    // longer registered has nothing to render itself with.
    cleanup();
    stopFailing();
    shellStore.getState().reset();
});

describe('the sync application', () => {
    it('composes the five zones of the window', async () => {
        await renderApp();

        expect(byPart('app-shell')).toBeVisible();
        expect(byPart('titlebar')).toHaveTextContent('Local');
        expect(byPart('sidebar')).toHaveTextContent('Docs');
        // A window with no session opens on an empty centre, which is what it has to show.
        expect(byPart('workbench')).toBeVisible();
        expect(byPart('status-bar')).toHaveTextContent('Listo');
    });

    /** Settings are a dialog of the app, as in Async: the button of the title bar opens it. */
    it('opens the settings from the button of its title bar, with the defaults of requests', async () => {
        render(
            <PreferencesProvider>
                <MessagesProvider preferences={{ language: 'es' }}>
                    <SyncApp />
                </MessagesProvider>
            </PreferencesProvider>,
        );
        await act(() => Promise.resolve());

        await act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));

            return Promise.resolve();
        });

        expect(selectTabs(shellStore.getState()).map((tab) => tab.kind)).not.toContain('settings');
        expect(screen.getByRole('dialog', { name: 'General' })).toBeVisible();
        expect(screen.getByRole('option', { name: 'Requests' })).toBeVisible();

        // The settings are of the window, not of the test: they close before the next one opens.
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes' }));

        expect(screen.queryByRole('dialog', { name: 'General' })).toBeNull();
    });

    /** The grid is of shell, so it answers the same under either window. */
    it('splits the grid and restores it', async () => {
        await renderApp();

        expect(splitAndRestore(act)).toEqual([2, 1]);

        // The grid answers the change a frame later; the answer lands inside act.
        await act(async () => {
            for (let frame = 0; frame < 3; frame += 1) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        });
    });

    /** The path of the origin is a detail of main: the status bar has nothing to say about it. */
    it('writes no path in the status bar', async () => {
        await renderApp();

        expect(byPart('status-bar').querySelector('.font-mono')).toBeNull();
    });

    /** A toast leaves; the centre of the status line is where the failure stays to be read. */
    it('keeps an error in the notice centre once its toast is closed', async () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'failing',
            kind: 'failing',
            resource: 'mandor://demo/x/y/z',
        });
        await renderApp();

        fireEvent.click(screen.getByRole('button', { name: 'Fallar' }));
        fireEvent.click(within(byPart('toast')).getByRole('button', { name: 'Cerrar aviso' }));
        fireEvent.click(
            within(byPart('status-bar')).getByRole('button', { name: 'Avisos, 1 sin leer' }),
        );

        expect(screen.getByRole('dialog', { name: 'Avisos' })).toHaveTextContent(
            'No se pudo guardar',
        );
    });
});
