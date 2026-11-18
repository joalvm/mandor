import type { PropsWithChildren, ReactNode } from 'react';

type RequestSectionBodyProps = PropsWithChildren;

/**
 * The air of one section of the request: nothing stands against the edges of the panel, and
 * the blocks inside stand apart from each other. It fills the panel, so an editor that wants
 * the whole section keeps getting it.
 */
export function RequestSectionBody({ children }: RequestSectionBodyProps): ReactNode {
    return (
        <div
            className="flex h-full min-h-0 flex-col gap-gap-control px-pad-panel py-pad-control"
            data-part="request-section-body"
        >
            {children}
        </div>
    );
}
