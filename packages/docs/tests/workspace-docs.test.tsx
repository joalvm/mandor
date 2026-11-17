import { success, type ListedDoc } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceDocs } from '../src/index.js';
import { DocsSidebar } from '../src/components/sidebar/DocsSidebar.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([
            { name: 'notas.md', title: 'notas' },
            { name: 'readme.md', title: 'readme' },
        ]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the docs the window keeps', () => {
    /** Folding a section unmounts its body: a body that loaded on mount emptied the list first. */
    it('keeps the list through a fold of the section, without reading it again', async () => {
        render(<WorkspaceDocs />, { wrapper: AppProviders });

        const unfolded = render(<DocsSidebar />, { wrapper: AppProviders });

        await screen.findByRole('option', { name: 'readme' });
        unfolded.unmount();
        render(<DocsSidebar />, { wrapper: AppProviders });

        expect(screen.getAllByRole('option')).toHaveLength(2);
        expect(bridge.doc.list).toHaveBeenCalledTimes(1);
    });

    /** Nothing watches the folder: unfolding the section is how a note written elsewhere arrives. */
    it('reads the folder again when the section unfolds, and keeps the list until it answers', async () => {
        let answer: (docs: ListedDoc[]) => void = () => undefined;

        render(
            <>
                <WorkspaceDocs />
                <DocsSidebar />
            </>,
            { wrapper: AppProviders },
        );
        await screen.findByRole('option', { name: 'readme' });
        vi.mocked(bridge.doc.list).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    answer = (docs) => {
                        resolve(success(docs));
                    };
                }),
        );

        act(() => {
            shellStore.getState().setPanels({ collapsedSections: ['docs'] });
        });
        expect(bridge.doc.list).toHaveBeenCalledTimes(1);

        act(() => {
            shellStore.getState().setPanels({ collapsedSections: [] });
        });
        expect(screen.getAllByRole('option')).toHaveLength(2);

        act(() => {
            answer([
                { name: 'notas.md', title: 'notas' },
                { name: 'nueva.md', title: 'nueva' },
                { name: 'readme.md', title: 'readme' },
            ]);
        });

        expect(await screen.findByRole('option', { name: 'nueva' })).toBeInTheDocument();
        expect(bridge.doc.list).toHaveBeenCalledTimes(2);
    });

    /** Every row of the lateral draws the glyph of its kind as small as the chevron beside it. */
    it('draws each note beside the small glyph every row of the lateral shares', async () => {
        render(
            <>
                <WorkspaceDocs />
                <DocsSidebar />
            </>,
            { wrapper: AppProviders },
        );

        const note = await screen.findByRole('option', { name: 'readme' });

        expect(note.querySelector('svg')).toHaveAttribute('width', '14');
    });
});
