import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocPage } from '../src/components/view/DocPage.js';

import { AppProviders } from './support/app-providers.js';

const DOC = '# Guía\n\n[Ir al arranque](#puesta-en-marcha)\n\n## Puesta en marcha\n\nTexto.\n';
const writeText = vi.fn<(text: string) => Promise<void>>();
const scrollIntoView = vi.fn();

function show(value: string): void {
    render(<DocPage value={value} />, { wrapper: AppProviders });
}

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    scrollIntoView.mockReset();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    // jsdom lays nothing out, so it has no scrolling into view to offer.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: scrollIntoView,
    });
});

afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

/** The headings of a doc (DocHeading), with the anchor a link of the doc lands on. */
describe('a heading of a doc', () => {
    /** The copy button sits inside the heading, and is not a word of its title. */
    it('is named by its words alone', () => {
        show(DOC);

        expect(screen.getByRole('heading', { level: 2, name: 'Puesta en marcha' })).toBeVisible();
    });

    it('copies the link to its own section', async () => {
        show(DOC);

        const [, section] = screen.getAllByRole('button', { name: 'Copy link to this section' });

        fireEvent.click(section ?? document.body);

        expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();
        expect(writeText).toHaveBeenCalledWith('#puesta-en-marcha');
    });

    /** A `#section` link stays on the page: it scrolls to the heading, it never navigates. */
    it('is where a link to its section takes the page', () => {
        show(DOC);

        const link = screen.getByRole('link', { name: 'Ir al arranque' });
        const stayed = fireEvent.click(link);

        expect(stayed).toBe(false);
        expect(scrollIntoView.mock.contexts[0]).toBe(
            screen.getByRole('heading', { level: 2, name: 'Puesta en marcha' }),
        );
    });

    it('takes a link to a section that is not there nowhere', () => {
        show('[Ir](#no-existe)\n\n## Otra\n');

        fireEvent.click(screen.getByRole('link', { name: 'Ir' }));

        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    /**
     * The heading over the notes is for screen readers: nobody links to it, so it carries no
     * button, and the references are described by it.
     */
    it('leaves the heading over the footnotes hidden, as the name the references read', () => {
        show('# Guía\n\nCaduca[^1].\n\n[^1]: A los treinta días.\n');

        expect(screen.getAllByRole('button', { name: 'Copy link to this section' })).toHaveLength(
            1,
        );
        expect(screen.getByRole('link', { name: '1' })).toHaveAccessibleDescription('Footnotes');
    });

    it('is where the reference of a footnote takes the page', () => {
        show('Caduca[^1].\n\n[^1]: A los treinta días.\n');

        fireEvent.click(screen.getByRole('link', { name: '1' }));

        expect(scrollIntoView.mock.contexts[0]).toHaveTextContent('A los treinta días.');
    });

    /** The arrow at the end of a note is named, and takes the reader back where they were. */
    it('takes the reader from the note back to its reference', () => {
        show('Caduca[^1].\n\n[^1]: A los treinta días.\n');

        fireEvent.click(screen.getByRole('link', { name: 'Back to reference 1' }));

        expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('link', { name: '1' }));
    });
});
