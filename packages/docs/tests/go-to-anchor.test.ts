import { afterEach, describe, expect, it, vi } from 'vitest';

import { goToAnchor } from '../src/lib/go-to-anchor.js';

/** Two pages of the same doc: the same ids twice, as when one doc is open in two tabs. */
function twoPages(): { link: HTMLElement; target: (page: number, id: string) => HTMLElement } {
    document.body.innerHTML = [0, 1]
        .map(
            () =>
                '<div data-part="doc-page"><div id="user-content-pagos"></div>' +
                '<div id="año"></div><a href="#pagos">x</a></div>',
        )
        .join('');

    const pages = document.querySelectorAll<HTMLElement>('[data-part="doc-page"]');

    return {
        link: pages[0]?.querySelector('a') ?? document.body,
        target: (page, id) =>
            pages[page]?.querySelector<HTMLElement>(`[id="${id}"]`) ?? document.body,
    };
}

afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('a link of a doc to a place of its page', () => {
    it('scrolls to the id the filter prefixed, in the page of the link only', () => {
        const scrolled = vi.spyOn(HTMLDivElement.prototype, 'scrollIntoView');
        const { link, target } = twoPages();

        goToAnchor(link, '#pagos');

        expect(scrolled.mock.contexts).toEqual([target(0, 'user-content-pagos')]);
    });

    it('reads the anchor as the doc wrote it, and keeps a stray percent as it is', () => {
        const scrolled = vi.spyOn(HTMLDivElement.prototype, 'scrollIntoView');
        const { link, target } = twoPages();

        goToAnchor(link, '#a%C3%B1o');
        goToAnchor(link, '#100%');

        expect(scrolled.mock.contexts).toEqual([target(0, 'año')]);
    });
});
