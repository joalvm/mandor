import { useMessages } from '@mandor/i18n';
import { useTextZoomInput } from '@mandor/ui';
import { useRef, type RefObject } from 'react';

import type { DocTaskToggle } from '../../hooks/useDocTask.js';
import { useDocLinks } from '../../hooks/useDocLinks.js';
import { DocView } from './DocView.js';

type DocPageProps = {
    /** Heard on every move of the page, for whoever is keeping something else level with it. */
    onScroll?: (() => void) | undefined;
    /** What a press on a box of a task does. Left out, the boxes only show what the text says. */
    onTask?: DocTaskToggle | undefined;
    /** The box that scrolls, for whoever has to read where it is or put it somewhere else. */
    pageRef?: RefObject<HTMLDivElement | null> | undefined;
    value: string;
};

/**
 * The doc as a page that can be scrolled, with its links wired to the workbench. It is the box
 * around the render and nothing else, which is why the places that show a page — the viewer, the
 * half beside the editor, the preview in a tab of its own — are one component and not three boxes
 * that drifted apart. A page of nothing says what it is waiting for. Over the page, as over an
 * editor, the reader resizes the text of the window.
 */
export function DocPage({ onScroll, onTask, pageRef, value }: DocPageProps) {
    const onOpenResource = useDocLinks();
    const ownRef = useRef<HTMLDivElement>(null);
    const ref = pageRef ?? ownRef;

    useTextZoomInput(ref);

    return (
        <div
            className="h-full min-h-0 overflow-y-auto"
            data-part="doc-page"
            onScroll={onScroll}
            ref={ref}
        >
            <DocPageBody onOpenResource={onOpenResource} onTask={onTask} value={value} />
        </div>
    );
}

function DocPageBody({
    onOpenResource,
    onTask,
    value,
}: {
    onOpenResource: ReturnType<typeof useDocLinks>;
    onTask: DocPageProps['onTask'];
    value: DocPageProps['value'];
}) {
    const messages = useMessages('docs');

    if (value.trim() === '') {
        return (
            <p className="p-pad-panel text-sm text-text-secondary" data-part="doc-page-empty">
                {messages('previewEmpty')}
            </p>
        );
    }

    return <DocView onOpenResource={onOpenResource} onTask={onTask} value={value} />;
}
