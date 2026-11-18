import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const DOC = [
    '# Título',
    '',
    'Un párrafo que ocupa',
    'dos líneas de fuente.',
    '',
    '- primero',
    '- segundo',
    '',
].join('\n');

function marks(container: HTMLElement): [string, string | null][] {
    return [...container.querySelectorAll('[data-line]')].map((block) => [
        block.tagName.toLowerCase(),
        block.getAttribute('data-line'),
    ]);
}

describe('the marks a drawn page carries', () => {
    /** Two halves of a split are pointed at the same place by the line each block came from. */
    it('writes on every block of the top level the line it was written from', () => {
        const { container } = render(<DocView value={DOC} />, { wrapper: AppProviders });

        expect(marks(container)).toEqual([
            ['h1', '1'],
            ['p', '3'],
            ['ul', '6'],
        ]);
    });

    /**
     * A document is scrolled by its paragraphs and its headings. An anchor every few words
     * would be a map at the scale of the thing it maps.
     */
    it('marks nothing inside a block', () => {
        const { container } = render(<DocView value={DOC} />, { wrapper: AppProviders });

        expect(container.querySelectorAll('li[data-line]')).toHaveLength(0);
    });

    /** The page is redrawn from the text on every change, and so are the places it points at. */
    it('marks what it is showing now and not what it showed before', () => {
        const { container, rerender } = render(<DocView value={DOC} />, { wrapper: AppProviders });

        rerender(<DocView value={'\n\n# Sólo un título\n'} />);

        expect(marks(container)).toEqual([['h1', '3']]);
    });
});
