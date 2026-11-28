import { useMessages, useSchemaWords } from '@mandor/i18n';
import {
    Button,
    CodeEditor,
    EmptyState,
    IconButton,
    SchemaIssues,
    SchemaSettings,
    withUncheckedPatternMarks,
    type CodeEditorHandle,
    type EditorOptions,
} from '@mandor/ui';
import { useMemo, useRef } from 'react';

import { violationsAgainst, type ExampleComparison } from '../../lib/compare/compare-example.js';
import { textOfResponse } from '../../lib/example-of.js';

export type ExampleSchemaTab = {
    /** Why the text of the schema cannot be read, when it cannot. */
    error?: string | undefined;
    /** Writes the schema from the expected body of the example. */
    onGenerate: () => void;
    onChange: (text: string) => void;
    /** The schema of the answer as text; `undefined` where there is none. */
    text: string | undefined;
};

type ExampleSchemaProps = ExampleSchemaTab & {
    /** How the answer of the last send stands against the example; `undefined` until one came. */
    comparison?: ExampleComparison | undefined;
    /** Who owns the text: the document of the schema is shared by every view of the example. */
    modelKey: string;
    /** The status of the answer the schema describes. */
    status: string;
};

const OPTIONS: EditorOptions = { lineNumbers: 'on', wordWrap: 'on' };

/**
 * The Schema tab: the shape the answer of the example must keep, as JSON Schema text. Without
 * one it says so and offers to write it from the expected body; with one it is the editor of
 * the text, under the band that names the response it describes. It is the example's own: two
 * examples of one status answer to different shapes when their params ask for them. Its options
 * write into the text; under it, the rules the last answer broke, each one a click from where it
 * is written.
 */
export function ExampleSchema({
    comparison,
    error,
    modelKey,
    onChange,
    onGenerate,
    status,
    text,
}: ExampleSchemaProps) {
    const labels = useMessages('requests');
    const schemaWords = useSchemaWords();
    const editor = useRef<CodeEditorHandle>(null);
    const said = schemaWords.pane.uncheckedPattern;
    const options = useMemo(() => withUncheckedPatternMarks(OPTIONS, said), [said]);

    if (text === undefined) {
        return (
            <EmptyState
                description={labels('exampleNoSchemaHint')}
                icon="schema"
                title={labels('exampleNoSchema', { status })}
            >
                <Button
                    data-part="example-schema-generate"
                    onClick={onGenerate}
                    variant="secondary"
                >
                    {labels('exampleGenerateSchema')}
                </Button>
            </EmptyState>
        );
    }

    const issues = schemaWords.issues(
        labels('exampleSchemaReceived', { status: String(comparison?.received.status ?? '') }),
        violationsAgainst(comparison, text),
    );

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="example-schema">
            <div
                className="flex h-section shrink-0 items-center gap-gap-control px-pad-panel text-sm"
                data-part="example-schema-bar"
            >
                <span className="text-text-secondary">
                    {labels('exampleSchemaOwner', { status })}
                </span>
                <IconButton
                    className="ms-auto"
                    data-part="example-schema-regenerate"
                    icon="format"
                    label={labels('exampleRegenerateSchema')}
                    onClick={onGenerate}
                />
                <SchemaSettings
                    labels={schemaWords.pane.settings}
                    onChange={onChange}
                    text={text}
                />
            </div>
            <SchemaError error={error} />
            <SchemaIssues
                issues={issues}
                judged={comparison === undefined ? undefined : textOfResponse(comparison.received)}
                onPick={(issue) => {
                    editor.current?.selectPointer(issue.schemaPath);
                }}
                schema={text}
            >
                <CodeEditor
                    labels={{ editor: labels('exampleSchemaEditor') }}
                    language="json"
                    modelKey={`${modelKey}#schema`}
                    onValueChange={onChange}
                    options={options}
                    ref={editor}
                    value={text}
                />
            </SchemaIssues>
        </div>
    );
}

function SchemaError({ error }: { error: string | undefined }) {
    if (error === undefined) {
        return null;
    }

    return (
        <p
            className="shrink-0 px-pad-panel pb-gap-control text-xs text-text-error"
            data-part="example-schema-error"
        >
            {error}
        </p>
    );
}
