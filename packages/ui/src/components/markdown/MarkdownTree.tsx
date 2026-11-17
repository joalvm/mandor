import type { ReactNode } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { MARKDOWN_DEFAULT_SCHEMA, type MarkdownSchema } from './markdown-schema.js';

export type MarkdownComponents = NonNullable<Options['components']>;
export type MarkdownPlugins = NonNullable<Options['rehypePlugins']>;

export type MarkdownTreeProps = {
    /** What to draw in place of an element, for the ones that reach outside the text. */
    components?: MarkdownComponents | undefined;
    /** Colours a fence in the language it names, and in no other. Off unless asked for. */
    highlight?: boolean | undefined;
    /** Plugins that run after the filter, so what the text wrote can never carry their marks. */
    rehypePlugins?: MarkdownPlugins | undefined;
    /** The schema of the filter. Left out, the default one: raw HTML never becomes a node. */
    sanitize?: MarkdownSchema | undefined;
    /** Reads every URL of the tree once more once it is drawn. */
    urlTransform?: Options['urlTransform'];
    value: string;
};

const NO_PLUGINS: MarkdownPlugins = [];

/**
 * The text turned into a tree and drawn. Raw HTML is not mounted (the renderer has no way to),
 * the tree the plugins build is filtered before anything is drawn from it, and the plugins of the
 * caller run after the filter, never before it.
 */
export function MarkdownTree({
    components,
    highlight = false,
    rehypePlugins = NO_PLUGINS,
    sanitize = MARKDOWN_DEFAULT_SCHEMA,
    urlTransform,
    value,
}: MarkdownTreeProps): ReactNode {
    const plugins: MarkdownPlugins = [
        [rehypeSanitize, sanitize],
        ...(highlight ? [rehypeHighlight] : []),
        ...rehypePlugins,
    ];

    return (
        <ReactMarkdown
            components={components}
            rehypePlugins={plugins}
            remarkPlugins={[remarkGfm]}
            skipHtml
            urlTransform={urlTransform}
        >
            {value}
        </ReactMarkdown>
    );
}
