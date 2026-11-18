import { success } from '@mandor/ipc';
import { bridge, tabKind, tabKindOf } from '@mandor/shell';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawnTabPart, translatorIn } from '@mandor/shell/testing/tab-kind';

import { DocPreviewTabKind, DocTabKind } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';

let unregister: (() => void)[] = [];

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    unregister = [render(<DocTabKind />).unmount, render(<DocPreviewTabKind />).unmount];
});

afterEach(() => {
    for (const each of unregister) {
        each();
    }
});

describe('the doc tab kind', () => {
    /**
     * The title lives in the list of the workspace and not in the resource, so a tab asks the list
     * and is told when it changes: the tab of a doc says what its row says, and a rename shows at once.
     */
    it('titles a tab with the title its row carries, and follows the list', () => {
        const resource = 'mandor://local-apis/events/doc/k3m9x2q7a4bd.md';

        docsStore.getState().setDocs([{ name: 'k3m9x2q7a4bd.md', title: 'Guía de uso' }]);

        expect(tabKindOf('doc').title(resource, translatorIn())).toBe('Guía de uso');
        expect(tabKind('doc')?.subscribeTitles).toBeTypeOf('function');
        expect(tabKind('doc-preview')?.subscribeTitles).toBeTypeOf('function');
    });

    /** The last view of a file leaving takes its text with it: the next one reads it again. */
    it('lets go of the text of the file when its last tab leaves', () => {
        docsStore.getState().setText(README, '# Readme\n');
        docsStore.getState().setText('mandor://local-apis/events/doc/other.md', '# Other\n');

        tabKindOf('doc').release?.('doc-1', README);

        expect(Object.keys(docsStore.getState().texts)).toEqual([
            'mandor://local-apis/events/doc/other.md',
        ]);
    });

    it('leaves the window when the app gives the kind back', () => {
        for (const each of unregister) {
            each();
        }

        expect(tabKind('doc')).toBeUndefined();
        expect(tabKind('doc-preview')).toBeUndefined();
    });

    it('shows what the file says once main has answered', async () => {
        vi.spyOn(bridge.doc, 'read').mockResolvedValue(success('# Readme\n'));

        render(<DrawnTabPart kind="doc-preview" resource={README} tabId="doc-preview-1" />, {
            wrapper: AppProviders,
        });

        expect(await screen.findByRole('heading', { level: 1, name: 'Readme' })).toBeVisible();
    });

    /** Two tabs on one file read one entry, so the second opens on what the first loaded. */
    it('reads the text of the resource once for every tab looking at it', async () => {
        const read = vi.spyOn(bridge.doc, 'read').mockResolvedValue(success('# Readme\n'));

        render(
            <>
                <DrawnTabPart kind="doc" resource={README} tabId="doc-1" />
                <DrawnTabPart kind="doc-preview" resource={README} tabId="doc-preview-1" />
            </>,
            { wrapper: AppProviders },
        );

        const shown = await screen.findAllByRole('heading', { level: 1, name: 'Readme' });

        expect(shown).toHaveLength(2);
        expect(read).toHaveBeenCalledTimes(1);
    });

    /** Something written is something to read, so the editor is asked for and not assumed. */
    it('opens a doc that has text as a page, and the editor when its button is taken', async () => {
        vi.spyOn(bridge.doc, 'read').mockResolvedValue(success('# Readme\n'));

        render(<DrawnTabPart kind="doc" resource={README} tabId="doc-1" />, {
            wrapper: AppProviders,
        });

        expect(await screen.findByRole('heading', { level: 1, name: 'Readme' })).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Doc editor' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

        expect(screen.getByRole('group', { name: 'Doc editor' })).toBeVisible();
    });

    /** Nothing written is nothing to read: an empty doc opens where it can be typed into. */
    it('opens an empty doc in the editor', async () => {
        vi.spyOn(bridge.doc, 'read').mockResolvedValue(success(''));

        render(<DrawnTabPart kind="doc" resource={README} tabId="doc-1" />, {
            wrapper: AppProviders,
        });

        expect(await screen.findByRole('group', { name: 'Doc editor' })).toBeVisible();
    });
});

describe('where a tab of a doc shows itself in the lateral', () => {
    /** A doc writes as it is edited, so neither kind ever holds work that is not on disk. */
    it('is the section of the docs, for the editor and its preview, and neither waits to be saved', () => {
        expect(tabKind('doc')?.section).toBe('docs');
        expect(tabKind('doc-preview')?.section).toBe('docs');
        expect(tabKind('doc')?.dirty).toBeUndefined();
    });
});
