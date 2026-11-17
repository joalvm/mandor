import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocLink } from '../src/components/view/DocLink.js';
import { DocOpenContext, type DocOpen } from '../src/hooks/useDocOpen.js';

function linked(href: string | undefined, open: DocOpen | null = null) {
    return render(
        <DocOpenContext.Provider value={open}>
            <DocLink href={href}>el enlace</DocLink>
        </DocOpenContext.Provider>,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('a link of a doc', () => {
    /** A link that leads nowhere is not a link: the sentence around it still reads. */
    it('stays as the text it was written as when nothing is left of its destination', () => {
        linked('');

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('el enlace')).toBeVisible();
    });

    it('stays as text when it never had a destination', () => {
        linked(undefined);

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('el enlace')).toBeVisible();
    });

    it('sends a link to the web to the browser of the machine, never inside the app', () => {
        linked('https://example.com/docs');

        const link = screen.getByRole('link', { name: 'el enlace' });

        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer noopener');
        expect(link).toHaveAttribute('title', 'https://example.com/docs');
    });

    it('opens a resource beside the doc and does not navigate', () => {
        const open = vi.fn();

        linked('mandor://local-apis/events/connection/ws-echo', open);

        const proceeded = fireEvent.click(screen.getByRole('link', { name: 'el enlace' }));

        expect(proceeded).toBe(false);
        expect(open).toHaveBeenCalledWith('mandor://local-apis/events/connection/ws-echo', true);
    });

    it('opens it where the reader already is when the link is taken with a modifier', () => {
        const open = vi.fn();

        linked('mandor://local-apis/events/doc/readme.md', open);
        fireEvent.click(screen.getByRole('link', { name: 'el enlace' }), { altKey: true });

        expect(open).toHaveBeenCalledWith('mandor://local-apis/events/doc/readme.md', false);
    });

    it('follows a link with no scheme as the title of another doc', () => {
        const open = vi.fn();

        linked('Guía de inicio', open);

        const link = screen.getByRole('link', { name: 'el enlace' });

        expect(link).toHaveAttribute('title', 'Guía de inicio');

        fireEvent.click(link);

        expect(open).toHaveBeenCalledWith('Guía de inicio', true);
    });

    it('does nothing when the surface around it offered no way to open', () => {
        linked('mandor://local-apis/events/doc/readme.md');

        expect(fireEvent.click(screen.getByRole('link', { name: 'el enlace' }))).toBe(false);
    });

    it('scrolls to the place an anchor names, and stays in the page', () => {
        const scrollIntoView = vi.spyOn(HTMLDivElement.prototype, 'scrollIntoView');

        render(
            <DocOpenContext.Provider value={null}>
                <div data-part="doc-page">
                    <div id="seccion">Sección</div>
                    <DocLink href="#seccion">ir a la sección</DocLink>
                </div>
            </DocOpenContext.Provider>,
        );

        const proceeded = fireEvent.click(screen.getByRole('link', { name: 'ir a la sección' }));

        expect(proceeded).toBe(false);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
});
