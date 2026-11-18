import type { PropsWithChildren } from 'react';

/**
 * The band over a doc. It is not painted: it is the same canvas as the doc, and only its buttons
 * show, at the end of it, where the controls of a band of this window sit.
 */
export function DocBand({ children }: PropsWithChildren) {
    return (
        <div
            className="flex h-section shrink-0 items-center justify-end gap-gap-control px-pad-panel"
            data-part="doc-band"
        >
            {children}
        </div>
    );
}
