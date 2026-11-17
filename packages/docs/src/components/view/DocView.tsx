import type { ReactNode } from 'react';
import { Markdown, type MarkdownComponents, type MarkdownPlugins } from '@mandor/ui';

import { DocOpenContext, type DocOpen } from '../../hooks/useDocOpen.js';
import { DocTaskContext, type DocTaskToggle } from '../../hooks/useDocTask.js';
import { DOC_SANITIZE_SCHEMA } from '../../lib/doc-sanitize-schema.js';
import { docUrl } from '../../lib/doc-url.js';
import { rehypeDocLines } from '../../lib/rehype-doc-lines.js';
import { rehypeDocMarks } from '../../lib/rehype-doc-marks.js';
import { DocHeading } from './DocHeading.js';
import { DocImage } from './DocImage.js';
import { DocLink } from './DocLink.js';
import { DocPre } from './DocPre.js';
import { DocQuote } from './DocQuote.js';
import { DocTask } from './DocTask.js';

export type DocViewProps = {
    /**
     * What to do with a link that names a resource of the workbench. Left out, such a link is
     * still drawn and still shows where it points, and taking it does nothing.
     */
    onOpenResource?: DocOpen | undefined;
    /**
     * What to do when a box of a task is pressed: the place of the task in the doc, counted from
     * the top. Left out, the boxes show what the text says and take no press.
     */
    onTask?: DocTaskToggle | undefined;
    /** The markdown on disk, as it is. What is rendered is what the repo says, never a copy. */
    value: string;
};

/**
 * What a doc draws differently from plain HTML: the two elements that reach outside the doc on
 * their own account, and the pieces GitHub adds to a page — the corner of a block, the anchor of
 * a heading, the box of a task, the colour of an alert. A constant: a new table on every render
 * would remount every block of the page as it is read.
 */
const COMPONENTS: MarkdownComponents = {
    a: DocLink,
    blockquote: DocQuote,
    h1: DocHeading,
    h2: DocHeading,
    h3: DocHeading,
    h4: DocHeading,
    h5: DocHeading,
    h6: DocHeading,
    img: DocImage,
    input: DocTask,
    pre: DocPre,
};

const PLUGINS: MarkdownPlugins = [rehypeDocLines, rehypeDocMarks];

/**
 * The whole of the doc surface: text in, render out. It does not know whether it sits in a tab of
 * its own or in the strip of an item, because the strip needs it and a viewer that assumed a tab
 * would have to be taken apart to get there.
 *
 * No store, no session, no grid. Everything it draws it was handed as a prop, so the same instance
 * serves both documentations of the workbench.
 *
 * A doc comes from the repo of the user, which is to say from whoever wrote it, so it is treated
 * as text from a stranger. Raw HTML never becomes a node — react-markdown does not mount any, and
 * nothing here turns that back on — the tree the plugins build is filtered before it is drawn, and
 * every URL in it is read once more afterwards. None of the three is a setting.
 *
 * The blocks are marked with the line they were written from, after the filter and never before
 * it, so what a doc writes can carry no mark of its own: nothing of the doc reaches that point
 * as an element. Reading it is optional — a page nobody is keeping level with simply ignores it.
 *
 * A fenced block is coloured, in the language the fence names and no other: this app is read by
 * people who write code, and the block of shell in the middle of a page is the part of it that
 * has to be read the most carefully. The colouring runs after the filter for the same reason
 * the marks do, and what it adds are spans of a class and never text of its own.
 */
export function DocView({ onOpenResource, onTask, value }: DocViewProps): ReactNode {
    return (
        <DocOpenContext.Provider value={onOpenResource ?? null}>
            <DocTaskContext.Provider value={onTask ?? null}>
                <Markdown
                    components={COMPONENTS}
                    highlight
                    rehypePlugins={PLUGINS}
                    sanitize={DOC_SANITIZE_SCHEMA}
                    urlTransform={docUrl}
                    value={value}
                />
            </DocTaskContext.Provider>
        </DocOpenContext.Provider>
    );
}
