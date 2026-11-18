import type { Element } from 'hast';
import { useMessages } from '@mandor/i18n';
import { useId, type PropsWithChildren } from 'react';

import { anchorOf, DOC_ID_PREFIX, textOf } from '../../lib/doc-hast.js';
import { DocCopy } from './DocCopy.js';

type DocHeadingProps = PropsWithChildren<{
    className?: string | undefined;
    'data-line'?: number | undefined;
    /** Only the heading over the footnotes carries one: the references are described by it. */
    id?: string | undefined;
    node?: Element | undefined;
}>;

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** The six levels, by the name the tree gives them. One component draws them all. */
const LEVELS: Readonly<Record<string, HeadingTag>> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
};

const ANCHOR = [
    'opacity-0 transition-opacity duration-fast',
    'group-focus-within:opacity-100 group-hover:opacity-100',
].join(' ');

/**
 * A heading with its anchor, as on GitHub: a `#section` link of the doc lands here, and under the
 * pointer the button that copies that link shows up beside it, to be pasted somewhere else.
 *
 * The heading is named by its words alone, so the button inside it is not read as part of the
 * title. The heading the forge writes over the footnotes is for screen readers only, and keeps
 * the class that hides it: nobody links to it.
 */
export function DocHeading({ children, className, 'data-line': line, id, node }: DocHeadingProps) {
    const messages = useMessages('docs');
    const words = useId();
    const Tag = LEVELS[node?.tagName ?? ''] ?? 'h2';

    if (className?.includes('sr-only') === true) {
        return (
            <Tag className="sr-only" id={id}>
                {children}
            </Tag>
        );
    }

    const anchor = anchorOf(textOf(node));

    return (
        <Tag
            aria-labelledby={words}
            className="group flex items-center gap-gap-icon-text"
            data-line={line}
            data-part="doc-heading"
            id={`${DOC_ID_PREFIX}${anchor}`}
        >
            <span className="min-w-0" id={words}>
                {children}
            </span>
            <span className={ANCHOR} data-part="doc-heading-anchor">
                <DocCopy copies="link" label={messages('copyLink')} text={`#${anchor}`} />
            </span>
        </Tag>
    );
}
