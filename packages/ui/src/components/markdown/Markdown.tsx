import type { ReactNode } from 'react';

import { useMarkdownRuntime } from '../../hooks/useMarkdownRuntime.js';
import { useTextZoom } from '../../hooks/useTextZoom.js';
import type { MarkdownRuntime } from './markdown-runtime.js';
import type { MarkdownTreeProps } from './MarkdownTree.js';

export type MarkdownProps = MarkdownTreeProps;

/**
 * Markdown from somebody else, drawn. The text is treated as a stranger's: raw HTML is not
 * mounted, and what the plugins build is filtered before anything is drawn from it.
 *
 * It paints and decides nothing: no store, no routing. What an element does when it is pressed is
 * the caller's, handed in as a `components` entry. It is drawn at the size the reader put the text
 * of the window at, the one the editors write in too. The renderer loads the first time markdown
 * is drawn; until then the frame stands empty.
 */
export function Markdown(props: MarkdownProps): ReactNode {
    const runtime = useMarkdownRuntime();
    const zoom = useTextZoom();

    return (
        <div data-part="markdown" data-text-zoom={zoom}>
            <LoadedTree {...props} runtime={runtime} />
        </div>
    );
}

/** The tree, once its renderer is there; nothing before. */
function LoadedTree({ runtime, ...props }: MarkdownProps & { runtime: MarkdownRuntime | null }) {
    if (runtime === null) {
        return null;
    }

    const { MarkdownTree } = runtime;

    return <MarkdownTree {...props} />;
}
