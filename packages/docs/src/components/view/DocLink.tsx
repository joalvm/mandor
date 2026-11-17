import { RESOURCE_URI_SCHEME } from '@mandor/schema';
import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';

import { useDocOpen } from '../../hooks/useDocOpen.js';
import { titleOfLink } from '../../lib/doc-title-link.js';
import { goToAnchor } from '../../lib/go-to-anchor.js';

export type DocLinkProps = PropsWithChildren<{
    /** A footnote reference is described by the heading over the notes. */
    'aria-describedby'?: string | undefined;
    /** The way back from a note is an arrow, and this is what it is called. */
    'aria-label'?: string | undefined;
    href?: string | undefined;
    /** Only a footnote reference carries one, so the way back from the note has a place to land. */
    id?: string | undefined;
}>;

/**
 * A link of a doc. What is left of it after the filter may be nothing at all, and a link that
 * leads nowhere is not a link: it stays as the text it was written as, so the sentence around it
 * still reads.
 *
 * A link to `#section` stays in the page and scrolls it to the heading or the footnote it names.
 * A link that names a resource is followed by the app: it opens what it names and stops there. A
 * link with no scheme names another doc, by its title, and is followed the same way.
 * Everything else never navigates inside the app. The window denies every window a page tries to
 * open and hands the URL to the browser of the machine, and the destination is in the title
 * before the click rather than after it.
 */
export function DocLink({
    'aria-describedby': describedBy,
    'aria-label': label,
    children,
    href,
    id,
}: DocLinkProps): ReactNode {
    const open = useDocOpen();

    if (href === undefined || href === '') {
        return <span data-part="doc-link">{children}</span>;
    }

    if (href.startsWith('#')) {
        return (
            <a
                aria-describedby={describedBy}
                aria-label={label}
                data-part="doc-link"
                href={href}
                id={id}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    goToAnchor(event.currentTarget, href);
                }}
            >
                {children}
            </a>
        );
    }

    const title = titleOfLink(href);

    if (href.startsWith(RESOURCE_URI_SCHEME) || title !== null) {
        return (
            <a
                data-part="doc-link"
                href={href}
                onClick={(event: MouseEvent) => {
                    event.preventDefault();

                    // Reading the doc is why the panel is split, so what it names lands in the
                    // other half unless the reader asks for it where they already are.
                    open?.(href, !event.altKey);
                }}
                title={title ?? href}
            >
                {children}
            </a>
        );
    }

    return (
        <a data-part="doc-link" href={href} rel="noreferrer noopener" target="_blank" title={href}>
            {children}
        </a>
    );
}
