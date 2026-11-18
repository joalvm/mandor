import type { DocAnchor } from './doc-scroll-map.js';

/** What the plugin writes on every block it drew, and the only thing read back off the page. */
const LINE = 'data-line';

/**
 * The blocks of a drawn page, each with the line of markdown it came from and how far down the
 * page it sits. Measured against the box that scrolls and not against the window, so the
 * numbers mean the same thing as the scroll position they are compared with.
 *
 * Read on every sync rather than kept: an image that finished loading, a table that rewrapped
 * when the split moved, a block that folded — all of them move the page without telling anyone.
 */
export function docAnchors(page: HTMLElement): DocAnchor[] {
    const origin = page.getBoundingClientRect().top - page.scrollTop;

    return [...page.querySelectorAll(`[${LINE}]`)].flatMap((block) => {
        const line = Number.parseInt(block.getAttribute(LINE) ?? '', 10);

        return Number.isNaN(line)
            ? []
            : [{ line, top: block.getBoundingClientRect().top - origin }];
    });
}
