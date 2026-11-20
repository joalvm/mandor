import { MessagesProvider } from '@mandor/i18n';
import type * as Repos from '@mandor/repos';
import { PreferencesProvider } from '@mandor/prefs';
import { shellStore } from '@mandor/shell';
import { allByPart, byPart } from '@mandor/ui/testing';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncApp } from '../../../src/renderer/app/SyncApp.js';

// Opening the origin is what the window does first and what this file is least about: the boot
// belongs to the package that owns the origins, and it is tested there.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return { ...repos, useOriginBoot: () => undefined };
});

/** The header of every section, in the order the sidebar drew them. */
function sectionTitles(): (string | undefined)[] {
    return allByPart('collapsible').map(
        (section) =>
            section.querySelector('[data-part="collapsible-title"]')?.textContent ?? undefined,
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
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the lateral of the sync window', () => {
    /** The lateral of Sync is the collection and the documentation. Connections are of Async. */
    it('draws its two sections in the order the window gives them, and no connections', async () => {
        await renderApp();

        expect(sectionTitles()).toEqual(['Docs', 'Colecciones']);
        expect(
            allByPart('sidebar-slot').find((slot) => slot.dataset['fills'] === 'true'),
        ).toHaveTextContent('Colecciones');
        expect(byPart('sidebar')).not.toHaveTextContent('Conexiones');
    });

    /** The searcher is the header of the bar, always unfolded, above every section. */
    it('keeps the searcher in the header of the bar, outside the sections', async () => {
        await renderApp();

        expect(allByPart('sidebar-header')).toHaveLength(1);
    });

    /** The documents come in at the heading of the collections, and leave by each collection. */
    it('carries the door to import in the heading of the collections', async () => {
        await renderApp();

        expect(screen.getByRole('button', { name: 'Importar un documento' })).toBeVisible();
    });
});
