import { useEditorIssueMessage, useMessages, useSchemaWords } from '@mandor/i18n';
import { applyGeneratedPayload, withSchemaToValue } from '@mandor/validate';
import {
    SchemaPane,
    Tabs,
    TabsList,
    TabsPanel,
    TabsStrip,
    TabsTab,
    useSchemaChecker,
    useSettledValue,
    useToast,
    type EditorLanguage,
    type EditorOptions,
} from '@mandor/ui';
import { useMemo } from 'react';

import { schemaVerdict } from '../../../../outbound/schema-verdict.js';

import { MessageDescription } from './MessageDescription.js';

type MessageStripProps = {
    description: string;
    onDescriptionChange: (description: string) => void;
    onGenerateSchema: () => void;
    onPayloadChange: (payload: string) => void;
    onSchemaChange: (schema: string) => void;
    onSectionChange: (section: string) => void;
    payload: string;
    payloadLanguage: EditorLanguage;
    resource: string;
    schema: string;
    section: string;
    /** How the payload is checked against its schema, or nothing when nobody checks it. */
    schemaLint?: EditorOptions['schemaLint'];
};

/**
 * The strip of the item: what it is for, what gets sent, and the shape it must meet. The three
 * sections stay mounted one at a time, and the documents they hold live by their key, so
 * switching tabs never costs a text that was half written. The payload section generates from
 * the schema, and the schema section from the body: both walk the same protection, which is
 * why the generation of the body happens here, where the two documents meet. The schema
 * section lists, under its text, the rules the payload breaks.
 */
export function MessageStrip({
    description,
    onDescriptionChange,
    onGenerateSchema,
    onPayloadChange,
    onSchemaChange,
    onSectionChange,
    payload,
    payloadLanguage,
    resource,
    schema,
    section,
    schemaLint,
}: MessageStripProps) {
    const messages = useMessages('messages');
    const issueMessage = useEditorIssueMessage();
    const editorWords = useMessages('editor');
    const schemaWords = useSchemaWords();
    const toast = useToast();
    // Every mark of the margin — the shape of the payload and the syntax of it — is read here.
    const options: EditorOptions = {
        translate: issueMessage,
        wordWrap: 'on',
        ...(schemaLint === undefined ? {} : { schemaLint }),
    };

    function onGeneratePayload(): void {
        if (schema.trim() === '') {
            return;
        }

        withSchemaToValue((schemaToValue) => {
            applyGeneratedPayload({
                apply: onPayloadChange,
                ask: { notify: toast.notify, words: editorWords },
                generated: schemaToValue(schema),
                payload,
                schema,
            });
        });
    }

    // Only a json body has a shape to meet, and only a written schema has one to generate from.
    const generatesSchema = payloadLanguage === 'jsonc';
    const checked = useSchemaChecker();
    const written = useMemo(() => ({ payload, schema }), [payload, schema]);
    // Read once the typing pauses: parsing a payload of megabytes at every key lagged it.
    const settled = useSettledValue(written, resource);
    const broken = useMemo(
        () =>
            checked
                ? schemaVerdict({ ...settled, payloadType: generatesSchema ? 'json' : 'text' })
                : [],
        [checked, generatesSchema, settled],
    );

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="message-strip">
            <Tabs onValueChange={onSectionChange} value={section}>
                <TabsStrip>
                    <TabsList label={messages('sections')}>
                        <TabsTab label={messages('description')} value="description" />
                        <TabsTab label={messages('payload')} value="payload" />
                        <TabsTab
                            broken={broken.length > 0}
                            filled={schema.trim() !== '' && broken.length === 0}
                            label={messages('schemaPane')}
                            value="schema"
                        />
                    </TabsList>
                </TabsStrip>
                <TabsPanel value="description">
                    <MessageDescription
                        onChange={onDescriptionChange}
                        resource={resource}
                        value={description}
                    />
                </TabsPanel>
                <TabsPanel value="payload">
                    <SchemaPane
                        editor={{
                            key: `message-payload-${resource}`,
                            language: payloadLanguage,
                            onValueChange: onPayloadChange,
                            value: payload,
                        }}
                        labels={{
                            editor: messages('payloadEditor'),
                            generate: messages('generateFromSchema'),
                        }}
                        onGenerate={
                            generatesSchema && schema.trim() === '' ? undefined : onGeneratePayload
                        }
                        options={options}
                    />
                </TabsPanel>
                <TabsPanel value="schema">
                    <SchemaPane
                        editor={{
                            key: `message-schema-${resource}`,
                            language: 'json',
                            onValueChange: onSchemaChange,
                            value: schema,
                        }}
                        issues={schemaWords.issues(editorWords('schemaSubjectPayload'), broken)}
                        judged={payload}
                        labels={{
                            ...schemaWords.pane,
                            editor: messages('schemaEditor'),
                            generate: messages('schemaPaneGenerate'),
                        }}
                        onGenerate={generatesSchema ? onGenerateSchema : undefined}
                        options={{ wordWrap: options.wordWrap }}
                    />
                </TabsPanel>
            </Tabs>
        </div>
    );
}
