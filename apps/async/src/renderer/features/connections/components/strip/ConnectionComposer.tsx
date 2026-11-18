import { useEditorVariables } from '@mandor/env';
import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { applyGeneratedPayload, withSchemaToValue } from '@mandor/validate';
import type {
    ConnectionTransport,
    Environment,
    MessagePayloadType,
    Variable,
} from '@mandor/schema';
import { SchemaPane, useToast, type SchemaPaneHandle, schemaLintOf } from '@mandor/ui';
import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { payloadLanguage } from '../../../../editor/payload-language.js';
import type { ComposerEvent } from '../../../../events/composer-events-store.js';

import { ComposerFooter } from './ComposerFooter.js';

type ConnectionComposerProps = {
    connectionId: string;
    /** The environment whose variables the payload names, for the editor to tint them. */
    environment: Environment | undefined;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** The event being composed, or nothing while the composer holds free text. */
    event: ComposerEvent | undefined;
    /** The event this connection emits to, shown beside the editor when the transport names it. */
    eventName: string;
    onEventNameChange: (eventName: string) => void;
    onExpectAckChange: (enabled: boolean) => void;
    onPayloadChange: (payload: string) => void;
    onSend: (data: string, eventName: string) => void;
    /** How the panel reads what the composer holds; the selector writes it. */
    onPayloadTypeChange: (payloadType: MessagePayloadType) => void;
    payloadType: MessagePayloadType;
    transport: ConnectionTransport;
};

/**
 * The event being composed. The text is the event's own — its file is what the composer edits,
 * and a save is what puts the two back together — so the document is keyed by the event, and
 * the same event held by two views of the connection is one text. The schema is not edited
 * here: it lives in the schema tab beside this one, and this editor reads it to say what the
 * payload already breaks while the body is being written. The body it asks for is one button
 * away, under the same protection every generation of the app walks.
 */
export function ConnectionComposer({
    connectionId,
    environment,
    event,
    eventName,
    onEventNameChange,
    onExpectAckChange,
    onVariablesChange,
    onPayloadChange,
    onSend,
    onPayloadTypeChange,
    payloadType,
    transport,
}: ConnectionComposerProps): ReactNode {
    const messages = useMessages('connections');
    const issueMessage = useEditorIssueMessage();
    // The replacement is asked in the words of the editor: every place that generates, in both
    // apps, shares the question.
    const replaceWords = useMessages('editor');
    const toast = useToast();
    const paneRef = useRef<SchemaPaneHandle>(null);
    const variables = useEditorVariables({ environment, onVariablesChange });
    // Only a payload declared as JSON has a schema to generate from.
    const json = payloadType === 'json';

    // The resolver rides the options, so a change of environment reconfigures the editor once.
    const { payload = '', schema = '' } = event ?? {};

    const options = useMemo(
        () => ({
            wordWrap: 'on' as const,
            variables: variables.editor,
            schemaLint: schemaLintOf(schema),
            // Every mark of the margin is read by whoever writes the payload, in their language.
            translate: issueMessage,
        }),
        [variables.editor, schema, issueMessage],
    );

    function onGenerateFromSchemaClick(): void {
        if (schema.trim() === '') {
            return;
        }

        withSchemaToValue((schemaToValue) => {
            applyGeneratedPayload({
                apply: onPayloadChange,
                ask: { notify: toast.notify, words: replaceWords },
                generated: schemaToValue(schema),
                payload,
                schema,
            });
        });
    }

    function onKeyDown(keyEvent: KeyboardEvent<HTMLDivElement>): void {
        if (keyEvent.key !== 'Enter' || (!keyEvent.ctrlKey && !keyEvent.metaKey)) {
            return;
        }

        keyEvent.preventDefault();
        onSend(payload, eventName);
    }

    return (
        <div
            aria-label={messages('composer')}
            className="flex h-full min-h-0 flex-col"
            data-part="composer"
            onKeyDown={onKeyDown}
            role="group"
        >
            <SchemaPane
                editor={{
                    key:
                        event === undefined
                            ? `composer-${connectionId}`
                            : `event-${event.eventResource}`,
                    language: payloadLanguage(payloadType, payload),
                    onValueChange: onPayloadChange,
                    value: payload,
                }}
                labels={{
                    editor: messages('payloadEditor'),
                    generate: messages('generateFromSchema'),
                }}
                onGenerate={json ? onGenerateFromSchemaClick : undefined}
                options={options}
                ref={paneRef}
            />
            {variables.popover}
            <ComposerFooter
                eventName={eventName}
                expectAckEnabled={event?.expectAck?.enabled ?? false}
                onBeautify={() => {
                    // Formatting is an edit of the editor's own: it lands in its undo, keeps the
                    // comments and templates where they were, and reaches the draft by the road
                    // every keystroke takes.
                    fireAndForget(paneRef.current?.editor?.run('format'));
                }}
                onEventNameChange={onEventNameChange}
                onExpectAckChange={onExpectAckChange}
                onPayloadTypeChange={onPayloadTypeChange}
                payloadType={payloadType}
                transport={transport}
            />
        </div>
    );
}
