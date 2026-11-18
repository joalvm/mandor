import { useLayoutEffect, useRef } from 'react';

import type { DocSurfaceDoc } from '../../doc-view-state.js';
import { rememberDocTop, rememberedDocTop } from '../../lib/doc-scroll-memory.js';
import { toggledTask } from '../../lib/toggle-task.js';
import { DocPage } from '../view/DocPage.js';

type DocReadPageProps = { doc: DocSurfaceDoc };

/**
 * The doc read as a page, put back where its reader left it. Coming back from the editor with
 * the page at the top would be the worst moment to lose the place: somebody went to look at the
 * markdown of the paragraph they were on, and would land three screens above it.
 *
 * The place is restored before the browser paints, so it is never seen at the top first.
 */
export function DocReadPage({ doc }: DocReadPageProps) {
    const pageRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const page = pageRef.current;

        if (page !== null) {
            page.scrollTop = rememberedDocTop(doc.place);
        }
    }, [doc.place]);

    return (
        <DocPage
            onScroll={() => {
                rememberDocTop(doc.place, pageRef.current?.scrollTop ?? 0);
            }}
            onTask={(index) => {
                doc.onChange(toggledTask(doc.value, index));
            }}
            pageRef={pageRef}
            value={doc.value}
        />
    );
}
