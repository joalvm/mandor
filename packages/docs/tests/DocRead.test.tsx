import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocRead } from '../src/components/surface/DocRead.js';
import { forgetDocTop, rememberedDocTop } from '../src/lib/doc-scroll-memory.js';

import { AppProviders } from './support/app-providers.js';

const DOC = '# Guía\n\nEl endpoint responde en JSON.\n';
const KEY = 'mandor://local-apis/events/doc/guia.md';
const PLACE = 'doc-read-1';

function readAt(place: string, value = DOC) {
    const onChange = vi.fn();
    const onView = vi.fn();
    const { container, unmount } = render(
        <DocRead
            doc={{ label: 'Doc editor', modelKey: KEY, onChange, place, value }}
            onView={onView}
            view={{ mode: 'read', preview: false }}
        />,
        { wrapper: AppProviders },
    );

    return { container, onChange, onView, unmount };
}

function scrollTo(page: HTMLElement, top: number): void {
    page.scrollTop = top;
    fireEvent.scroll(page);
}

beforeEach(() => {
    forgetDocTop(PLACE);
});

/** The viewer (DocRead): its band (DocBand), its page (DocReadPage) or its empty state (DocEmpty). */
describe('the doc read as a page', () => {
    it('shows the markdown drawn', () => {
        readAt(PLACE);

        expect(screen.getByRole('heading', { level: 1, name: 'Guía' })).toBeVisible();
    });

    it('crosses to the editor from the button of its band', () => {
        const { onView } = readAt(PLACE);

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

        expect(onView).toHaveBeenCalledWith({ mode: 'write' });
    });

    /**
     * Crossing to the editor unmounts the page: one that came back at the top would throw away
     * the place of whoever went to look at the markdown of the paragraph they were reading.
     */
    it('comes back where its reader left it', () => {
        const first = readAt(PLACE);

        scrollTo(byPart('doc-page', first.container), 420);

        expect(rememberedDocTop(PLACE)).toBe(420);

        first.unmount();

        expect(byPart('doc-page', readAt(PLACE).container).scrollTop).toBe(420);
    });

    it('opens at the top for a place nobody has scrolled', () => {
        expect(byPart('doc-page', readAt('doc-read-2').container).scrollTop).toBe(0);
    });

    /** An empty page is a place to start writing, not a blank to stare at. */
    it('offers to write a doc that has nothing in it', () => {
        const { onView } = readAt(PLACE, '  \n');

        expect(screen.getByText('This doc is empty')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Write' }));

        expect(onView).toHaveBeenCalledWith({ mode: 'write' });
    });

    /** The box of a task is the text: pressing it writes the doc, which then draws the box. */
    it('writes the doc when the box of a task is pressed', () => {
        const { onChange } = readAt(PLACE, '- [ ] Probar\n- [x] Publicar\n');
        const first = screen.getAllByRole('checkbox', { name: 'Task done' })[0];

        fireEvent.click(first ?? document.body);

        expect(onChange).toHaveBeenCalledWith('- [x] Probar\n- [x] Publicar\n');
    });
});
