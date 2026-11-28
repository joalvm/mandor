import { useMessages } from '@mandor/i18n';
import { HttpIcon } from '@mandor/icons';
import { Breadcrumbs } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

type RequestBreadcrumbProps = PropsWithChildren<{
    /** What the request is called; the last step, and the one that is current. */
    name: string;
    /** The collection and the folders above the request, outermost first. */
    trail: readonly string[];
}>;

/**
 * Where the request stands: the protocol it speaks in its own hue, then the collection, the
 * folders, and its own name at the end. The tab says what is open; this says where it lives,
 * which the tab cannot once two folders hold a request with the same name. It takes one quiet
 * row, lower than a band, and gives the url bar below it nothing to compete with; what is done
 * with the request as a whole closes the row.
 */
export function RequestBreadcrumb({ children, name, trail }: RequestBreadcrumbProps) {
    const labels = useMessages('requests');

    return (
        <div
            className="flex h-crumb shrink-0 items-center gap-gap-control overflow-hidden pt-0.5 pe-1.5 ps-pad-panel"
            data-part="request-breadcrumb"
        >
            <Breadcrumbs label={labels('breadcrumb')} parts={[...trail, name]}>
                <span className="flex items-center text-text-info">
                    <HttpIcon />
                </span>
            </Breadcrumbs>
            <span className="flex shrink-0 items-center gap-gap-tight" data-part="request-actions">
                {children}
            </span>
        </div>
    );
}
