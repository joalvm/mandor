import type { Element } from 'hast';
import type { PropsWithChildren } from 'react';

import { languageOf, textOf } from '../../lib/doc-hast.js';
import { DocCode } from './DocCode.js';
import { DocDiagram } from './DocDiagram.js';

type DocPreProps = PropsWithChildren<{
    /** The line of the doc the fence opens at, for whoever keeps the page level with the text. */
    'data-line'?: number | undefined;
    node?: Element | undefined;
}>;

/** The language a fence names to be drawn instead of shown. */
const DIAGRAM = 'mermaid';

/**
 * A fenced block of a doc: a diagram when the fence says `mermaid`, code in every other case.
 * What is copied is the text as written, without the line break the fence leaves at its end.
 */
export function DocPre({ children, 'data-line': line, node }: DocPreProps) {
    const code = node?.children[0];
    const language = languageOf(code);
    const source = textOf(code).replace(/\n$/, '');

    if (language === DIAGRAM) {
        return <DocDiagram line={line} source={source} />;
    }

    return (
        <DocCode language={language} line={line} source={source}>
            {children}
        </DocCode>
    );
}
