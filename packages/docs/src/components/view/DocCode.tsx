import { useMessages } from '@mandor/i18n';
import type { PropsWithChildren } from 'react';

import { DocCopy } from './DocCopy.js';

type DocCodeProps = PropsWithChildren<{
    language: string | undefined;
    line: number | undefined;
    source: string;
}>;

/** In the corner of the block, over it: hidden at rest, there under the pointer or the focus. */
const ACTIONS = [
    'absolute top-pad-control right-pad-control flex items-center gap-gap-icon-text',
    'rounded-md pl-pad-control',
    'opacity-0 transition-opacity duration-fast',
    'group-focus-within:opacity-100 group-hover:opacity-100',
].join(' ');

/**
 * A fenced block the way GitHub draws one: the code in its colours and, under the pointer or the
 * focus, its language and a copy in the corner. At rest they cover nothing, so a long line reads
 * to its end even where it reaches the edge of the block.
 */
export function DocCode({ children, language, line, source }: DocCodeProps) {
    const messages = useMessages('docs');

    return (
        <div className="group relative" data-line={line} data-part="doc-code-block">
            <div className={ACTIONS} data-part="doc-block-actions">
                <DocLanguage language={language} />
                <DocCopy label={messages('copyCode')} text={source} />
            </div>
            <pre>{children}</pre>
        </div>
    );
}

function DocLanguage({ language }: { language: DocCodeProps['language'] }) {
    if (language === undefined) {
        return null;
    }

    return (
        <span className="text-xs text-text-secondary" data-part="doc-code-language">
            {language}
        </span>
    );
}
