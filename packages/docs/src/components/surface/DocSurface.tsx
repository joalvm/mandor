import type { ComponentType } from 'react';

import type { DocMode, DocSide } from '../../doc-view-state.js';
import { DocRead } from './DocRead.js';
import { DocWrite } from './DocWrite.js';

type DocSurfaceProps = DocSide;

/** The two sides of a doc, by the mode that shows them. */
const SIDES: Readonly<Record<DocMode, ComponentType<DocSide>>> = {
    read: DocRead,
    write: DocWrite,
};

/**
 * The markdown of both apps, wherever it is: the doc of a workspace in its tab, the description
 * of a connection, of a message or of a request. One way in, the viewer, and one way to write,
 * the code editor with its page beside it. Viewer, band, editor and page are one canvas: nothing
 * is painted as a strip of its own.
 *
 * It decides nothing about where the text lives or where the side is kept: the tab keeps it in
 * the store, a description for as long as it is on screen.
 */
export function DocSurface({ doc, onView, view }: DocSurfaceProps) {
    const Side = SIDES[view.mode];

    return (
        <div className="h-full min-h-0" data-mode={view.mode} data-part="doc-surface">
            <Side doc={doc} onView={onView} view={view} />
        </div>
    );
}
