import { DOC_ID_PREFIX } from './doc-hast.js';

/** The anchor as the doc wrote it: it arrives encoded, and a stray `%` stays as it is. */
function anchorIn(href: string): string {
    try {
        return decodeURIComponent(href.slice(1));
    } catch {
        return href.slice(1);
    }
}

/**
 * Scrolls the page a `#section` link sits in to what the anchor names. The ids of a doc carry the
 * prefix the filter gave them and the link the doc wrote does not, so both are looked for, in the
 * page of this link only: the same doc open twice is two pages with the same ids.
 */
export function goToAnchor(from: HTMLElement, href: string): void {
    const anchor = anchorIn(href);
    const page = from.closest('[data-part="doc-page"]');
    const exact = page?.querySelector(`[id="${CSS.escape(anchor)}"]`);
    const prefixed = page?.querySelector(`[id="${CSS.escape(`${DOC_ID_PREFIX}${anchor}`)}"]`);

    (exact ?? prefixed)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
