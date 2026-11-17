import { describe, expect, it } from 'vitest';

import { docAnchors } from '../src/lib/doc-anchors.js';

/** jsdom lays nothing out, so every box of the page says where it is. */
function boxAt(element: HTMLElement, top: number): void {
    element.getBoundingClientRect = () => new DOMRect(0, top, 800, 20);
}

function pageWith(lines: (string | null)[], scrolled: number): HTMLElement {
    const page = document.createElement('div');

    boxAt(page, 50);
    Object.defineProperty(page, 'scrollTop', { value: scrolled, writable: true });

    lines.forEach((line, index) => {
        const block = document.createElement('p');

        if (line !== null) {
            block.setAttribute('data-line', line);
        }

        boxAt(block, 50 + index * 100);
        page.append(block);
    });

    return page;
}

describe('the blocks of a drawn page', () => {
    /**
     * Measured against the box that scrolls: the numbers are compared with a scroll position,
     * so a page that is already scrolled has to answer the same as one that is not.
     */
    it('says how far down its own box each block sits, wherever the page stands', () => {
        expect(docAnchors(pageWith(['1', '4'], 0))).toEqual([
            { line: 1, top: 0 },
            { line: 4, top: 100 },
        ]);
        expect(docAnchors(pageWith(['1', '4'], 300))).toEqual([
            { line: 1, top: 300 },
            { line: 4, top: 400 },
        ]);
    });

    it('leaves out what the plugin did not mark, and what it could not have written', () => {
        expect(docAnchors(pageWith([null, 'primera', '7'], 0))).toEqual([{ line: 7, top: 200 }]);
    });

    it('answers nothing for a page with no block in it', () => {
        expect(docAnchors(pageWith([], 0))).toEqual([]);
    });
});
