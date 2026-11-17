import { useMessages, useSchemaWords } from '@mandor/i18n';
import type { MessagePayloadType } from '@mandor/schema';
import { applyGeneratedSchema, schemaOfDraft, type TemplateIssue } from '@mandor/validate';
import { SchemaPane, useToast } from '@mandor/ui';

import type { ComposerEvent } from '../../../../events/composer-events-store.js';

type ConnectionSchemaProps = {
    /** The rules of the schema the payload about to leave breaks. */
    broken: readonly TemplateIssue[];
    connectionId: string;
    /** The event being composed, or nothing while the composer holds free text. */
    event: ComposerEvent | undefined;
    onSchemaChange: (schema: string) => void;
    payloadType: MessagePayloadType;
};

/**
 * The schema of the event being composed, in a tab of its own. It is written in the standard
 * `json` language, and the body it asks for is one button away — the same generation, under
 * the same protection, the schema tab of a message carries. Under it, the rules the payload
 * about to leave breaks; its options write into its text.
 */
export function ConnectionSchema({
    broken,
    connectionId,
    event,
    onSchemaChange,
    payloadType,
}: ConnectionSchemaProps) {
    const messages = useMessages('connections');
    const editorWords = useMessages('editor');
    const schemaWords = useSchemaWords();
    const toast = useToast();
    const payload = event === undefined ? '' : event.payload;
    const schema = event === undefined ? '' : event.schema;

    function onGenerateClick(): void {
        applyGeneratedSchema({
            apply: onSchemaChange,
            ask: { notify: toast.notify, words: editorWords },
            generated: schemaOfDraft(payload),
            payload,
            schema,
        });
    }

    return (
        <SchemaPane
            editor={{
                key:
                    event === undefined
                        ? `composer-schema-${connectionId}`
                        : `event-schema-${event.eventResource}`,
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
            onGenerate={event === undefined || payloadType !== 'json' ? undefined : onGenerateClick}
            options={{ wordWrap: 'on' }}
        />
    );
}
