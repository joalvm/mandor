import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import type { RequestExample } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import {
    Button,
    CodeEditor,
    Tabs,
    TabsList,
    TabsPanel,
    TabsStrip,
    TabsTab,
    schemaLintOf,
    type CodeEditorHandle,
    type EditorLanguage,
    type EditorOptions,
} from '@mandor/ui';
import { useMemo, useRef, type RefObject } from 'react';

import { violationsAgainst, type ExampleComparison } from '../../lib/compare/compare-example.js';
import type { ExampleReview } from '../../hooks/useExampleReview.js';
import type { SendEntry } from '../../responses.slice.js';
import { bodyShownOf } from '../../lib/example-body-shown.js';
import {
    expectedCookiesOf,
    expectedHeadersOf,
    withExpectedCookies,
    withExpectedHeaders,
} from '../../lib/expected-lines.js';
import { exampleLanguageOf } from '../../lib/example-language.js';
import { ExampleDiff } from './ExampleDiff.js';
import { ExampleDiffMark } from './ExampleDiffMark.js';
import { ExampleExpectedTable } from './ExampleExpectedTable.js';
import { ExampleSchema, type ExampleSchemaTab } from './ExampleSchema.js';
import { ExampleStatusPicker } from './ExampleStatusPicker.js';

type ExampleResponseProps = {
    /** How the answer of the last send differs from the example; `undefined` until one came. */
    comparison: ExampleComparison | undefined;
    /** Where the last send of the example stands. */
    entry: SendEntry;
    example: RequestExample;
    /** Who owns the text: the document of the body is shared by every view of the example. */
    modelKey: string;
    onChange: (example: RequestExample) => void;
    onSection: (section: string) => void;
    /** What a person does with the differences the last send showed. */
    review: ExampleReview;
    /** The schema of the status of the example, which the strip shows beside its headers. */
    schema: ExampleSchemaTab;
    /** The tab of the strip that is open. */
    section: string;
};

const OPTIONS: EditorOptions = { lineNumbers: 'on', wordWrap: 'on' };

/**
 * The answer an example promises, in the shape of the answer a send brings: its body and the
 * cookies and headers it declares, all written here. The status it stands for sits at the end of
 * the strip, where the summary of a real answer would be. The body is checked against the schema
 * of that status while it is written, as any answer would be.
 */
export function ExampleResponse({
    comparison,
    entry,
    example,
    modelKey,
    onChange,
    onSection,
    review,
    schema,
    section,
}: ExampleResponseProps) {
    const labels = useMessages('requests');
    const editor = useRef<CodeEditorHandle>(null);
    const language = exampleLanguageOf(example.contentType);
    const broken = violationsAgainst(comparison, schema.text).length;
    const issueMessage = useEditorIssueMessage();
    /** The editor compares these by identity: a new object each render would rebuild it. */
    const bodyOptions = useMemo<EditorOptions>(
        () => ({ ...OPTIONS, schemaLint: schemaLintOf(schema.text), translate: issueMessage }),
        [issueMessage, schema.text],
    );

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="example-response">
            <div className="min-h-0 flex-1">
                <Tabs onValueChange={onSection} value={section}>
                    <TabsStrip>
                        <TabsList label={labels('exampleSections')}>
                            <TabsTab label={labels('body')} value="body" />
                            <TabsTab
                                count={example.cookies?.length ?? 0}
                                label={labels('cookies')}
                                value="cookies"
                            />
                            <TabsTab
                                count={example.headers?.length ?? 0}
                                label={labels('headers')}
                                value="headers"
                            />
                            <TabsTab
                                broken={broken > 0}
                                filled={schema.text !== undefined && broken === 0}
                                label={labels('exampleSchema')}
                                value="schema"
                            />
                            <TabsTab
                                filled={comparison?.count === 0}
                                label={labels('exampleDiff')}
                                value="diff"
                            >
                                <ExampleDiffMark comparison={comparison} entry={entry} />
                            </TabsTab>
                        </TabsList>
                        <BeautifyBody editor={editor} language={language} section={section} />
                        <ExampleStatusPicker
                            onChange={(status) => {
                                onChange({ ...example, status });
                            }}
                            value={example.status}
                        />
                    </TabsStrip>
                    <TabsPanel value="body">
                        <CodeEditor
                            labels={{ editor: labels('exampleBody') }}
                            language={language}
                            modelKey={modelKey}
                            onValueChange={(body) => {
                                onChange({ ...example, body });
                            }}
                            options={bodyOptions}
                            ref={editor}
                            value={bodyShownOf(example.body, language)}
                        />
                    </TabsPanel>
                    <TabsPanel value="cookies">
                        <ExampleExpectedTable
                            onWrite={(pairs) => {
                                onChange(withExpectedCookies(example, pairs));
                            }}
                            pairs={expectedCookiesOf(example)}
                            title={labels('cookies')}
                        />
                    </TabsPanel>
                    <TabsPanel value="headers">
                        <ExampleExpectedTable
                            onWrite={(pairs) => {
                                onChange(withExpectedHeaders(example, pairs));
                            }}
                            pairs={expectedHeadersOf(example)}
                            title={labels('headers')}
                        />
                    </TabsPanel>
                    <TabsPanel value="schema">
                        <ExampleSchema
                            {...schema}
                            comparison={comparison}
                            modelKey={modelKey}
                            status={example.status}
                        />
                    </TabsPanel>
                    <TabsPanel value="diff">
                        <ExampleDiff
                            comparison={comparison}
                            entry={entry}
                            example={example}
                            onAccept={review.accept}
                        />
                    </TabsPanel>
                </Tabs>
            </div>
        </div>
    );
}

type BeautifyBodyProps = {
    editor: RefObject<CodeEditorHandle | null>;
    language: EditorLanguage;
    section: string;
};

/** Lays the text of the body out as its language does; only where the body is what is shown. */
function BeautifyBody({ editor, language, section }: BeautifyBodyProps) {
    const labels = useMessages('requests');

    if (section !== 'body' || language === 'plaintext') {
        return null;
    }

    return (
        <Button
            data-part="example-body-beautify"
            onClick={() => {
                fireAndForget(editor.current?.run('format'));
            }}
            size="sm"
            underlined={false}
            variant="link"
        >
            {labels('beautify')}
        </Button>
    );
}
