import { useMessages } from '@mandor/i18n';
import type { RequestExample } from '@mandor/schema';
import { DiffCodeEditor } from '@mandor/ui';
import { useMemo } from 'react';

import type { ExampleComparison } from '../../lib/compare/compare-example.js';
import { diffTextsOf } from '../../lib/compare/diff-texts.js';
import { textOfResponse } from '../../lib/example-of.js';
import { exampleLanguageOf } from '../../lib/example-language.js';

type ExampleDiffEditorProps = {
    comparison: ExampleComparison;
    example: RequestExample;
    /** Whether long lines wrap instead of scrolling sideways. */
    wrap: boolean;
};

/**
 * The body the example expects and the one that came, in the editor of the app and its theme:
 * the editor marks the lines that moved. What the schema refuses is the Schema tab's to say. The
 * panel is narrow, so the two are one above the other, and with no numbers: a line of the answer
 * is not a line of the example.
 */
export function ExampleDiffEditor({ comparison, example, wrap }: ExampleDiffEditorProps) {
    const labels = useMessages('requests');
    const { json, received } = comparison;
    const { body, contentType } = example;
    const texts = useMemo(
        () => diffTextsOf(body, textOfResponse(received), json),
        [body, json, received],
    );

    return (
        <div className="min-h-0 flex-1" data-part="example-diff-editor">
            <DiffCodeEditor
                inline
                labels={{
                    editor: labels('exampleDiff'),
                    modified: labels('exampleReceived'),
                    original: labels('examplePanelLabel'),
                }}
                language={json ? 'jsonc' : exampleLanguageOf(contentType)}
                lineNumbers="off"
                modified={texts.received}
                original={texts.expected}
                readOnly
                wrap={wrap}
            />
        </div>
    );
}
