import { editorAt } from '@mandor/ui/testing/editors-in';
import { allByPart, byPart } from '@mandor/ui/testing';
import { MARKDOWN_PREVIEW_EVENT } from '@mandor/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocWrite } from '../src/components/surface/DocWrite.js';

import { AppProviders } from './support/app-providers.js';

const DOC = '# Guía\n\nEl endpoint responde en JSON.\n';
const KEY = 'mandor://local-apis/events/doc/guia.md';

function write(preview = false) {
    const onView = vi.fn();
    const { container } = render(
        <DocWrite
            doc={{ label: 'Doc editor', modelKey: KEY, onChange: vi.fn(), place: KEY, value: DOC }}
            onView={onView}
            view={{ mode: 'write', preview }}
        />,
        { wrapper: AppProviders },
    );

    return { container, onView };
}

describe('the doc written as markdown', () => {
    /** The preview is an option of the editor, so one pane is what opening it gives. */
    it('opens as one pane, with no page beside it', async () => {
        const { container } = write();

        expect(await editorAt(0)).toBeDefined();
        expect(byPart('doc-write', container)).toBeVisible();
        expect(allByPart('doc-page', container)).toHaveLength(0);
    });

    it('puts the page beside the markdown when the reader asks for it', async () => {
        const { container } = write(true);

        expect(await editorAt(0)).toBeDefined();
        expect(byPart('doc-code', container)).toBeVisible();
        expect(byPart('doc-beside', container)).toBeVisible();
        expect(screen.getByRole('heading', { level: 1, name: 'Guía' })).toBeVisible();
    });

    /** The page draws the text being typed, not the file: it is the same string, not a read. */
    it('shows in the page what the editor is holding', () => {
        write(true);

        expect(screen.getByText('El endpoint responde en JSON.')).toBeVisible();
    });

    /** A doc is prose: a line that ran off the side would be a line nobody reads. */
    it('folds the long lines of the markdown', async () => {
        write();

        expect((await editorAt(0)).wraps()).toBe(true);
    });

    it('opens the page from the band, naming the chord that does the same', () => {
        const { onView } = write();

        fireEvent.click(
            screen.getByRole('button', { name: 'Open the preview beside it (Ctrl+K V)' }),
        );

        expect(onView).toHaveBeenCalledWith({ preview: true });
    });

    it('closes the page from the same button', () => {
        const { onView } = write(true);

        fireEvent.click(screen.getByRole('button', { name: /^Close the preview \(/ }));

        expect(onView).toHaveBeenCalledWith({ preview: false });
    });

    /** `Ctrl+K V` is pressed in the editor, which knows nothing of the band: it is heard here. */
    it('opens the page when the chord climbs out of the editor', () => {
        const { container, onView } = write();

        act(() => {
            byPart('doc-body', container).dispatchEvent(
                new CustomEvent(MARKDOWN_PREVIEW_EVENT, { bubbles: true }),
            );
        });

        expect(onView).toHaveBeenCalledWith({ preview: true });
    });

    it('goes back to the page from the last button of its band', () => {
        const { onView } = write();

        fireEvent.click(screen.getByRole('button', { name: 'View' }));

        expect(onView).toHaveBeenCalledWith({ mode: 'read' });
    });
});
