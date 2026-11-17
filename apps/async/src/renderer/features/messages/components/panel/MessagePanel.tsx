import { itemNameOf, useItem } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import type { MessageItem } from '@mandor/schema';
import { fireAndForget, useFailureToast, useKeepTab, useResourceSection } from '@mandor/shell';
import { useToast, schemaLintOf } from '@mandor/ui';
import { applyGeneratedSchema, schemaOfDraft } from '@mandor/validate';

import type { OutboundTarget } from '../../../../outbound/outbound-port.js';
import { outboundPort } from '../../../../outbound/outbound-registry.js';
import { itemPathOfResource } from '../../../../events/item-path-of-resource.js';
import { wirePayload } from '../../../../events/wire-payload.js';
import { useMessage } from '../../hooks/useMessage.js';
import { DEFAULT_MESSAGE_SECTION } from '../../lib/message-section.js';
import { payloadLanguage } from '../../../../editor/payload-language.js';
import { scheduleMessageWrite } from '../../lib/pending-message-write.js';
import { sendFrame } from '../../lib/send-frame.js';

import { MessageStrip } from '../strip/MessageStrip.js';
import { MessageToolbar } from './MessageToolbar.js';

/** Root of the messages feature: the only component that reads the store. Children get props. */
export function MessagePanel() {
    const { resource } = useItem();
    const notifyFailure = useFailureToast();
    const editorWords = useMessages('editor');
    const toast = useToast();
    const message = useMessage(resource);
    const keep = useKeepTab();
    const [section, setSection] = useResourceSection(resource, DEFAULT_MESSAGE_SECTION);

    if (message === undefined) {
        return null;
    }

    // Function declarations hoist above the guard, so they narrow the aliased const instead.
    const current = message;

    // Only a json payload has a shape to check, and only while a schema is written to check it.
    const schemaLint = schemaLintOf(current.schema);

    // An edited event is no longer a look the next click replaces.
    function edit(changes: Partial<MessageItem>): void {
        keep();
        scheduleMessageWrite(resource, { ...current, ...changes }, (code) => {
            notifyFailure(code);
        });
    }

    function generateSchema(): void {
        // A schema describes a json body; for text and binary there is nothing to infer.
        if (current.payloadType !== 'json') {
            return;
        }

        applyGeneratedSchema({
            apply: (schema) => {
                edit({ schema });
            },
            ask: { notify: toast.notify, words: editorWords },
            generated: schemaOfDraft(current.payload),
            payload: current.payload,
            schema: current.schema ?? '',
        });
    }

    function onSend(target: OutboundTarget): void {
        fireAndForget(
            sendFrame(target.id, {
                origin: itemNameOf(resource, current.name),
                itemPath: itemPathOfResource(resource),
                template: wirePayload(current.payload, current.payloadType),
                // Main is who checks the frame it resolved; the timeline mark is its answer.
                schema:
                    current.payloadType === 'json' && (current.schema ?? '').trim() !== ''
                        ? current.schema
                        : undefined,
            }),
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="message-panel">
            <MessageToolbar
                channel={current.channel ?? ''}
                onChannelChange={(channel) => {
                    // Blank is not a channel: the field goes off the file instead of holding ''.
                    edit({ channel: channel.trim() === '' ? undefined : channel });
                }}
                onPayloadTypeChange={(payloadType) => {
                    edit({ payloadType });
                }}
                onSend={onSend}
                payloadType={current.payloadType}
                targets={() => outboundPort()?.targets() ?? []}
            />
            <MessageStrip
                description={current.description ?? ''}
                onDescriptionChange={(description) => {
                    edit({ description: description === '' ? undefined : description });
                }}
                onGenerateSchema={generateSchema}
                onPayloadChange={(payload) => {
                    edit({ payload });
                }}
                onSchemaChange={(schema) => {
                    edit({ schema });
                }}
                onSectionChange={setSection}
                payload={current.payload}
                payloadLanguage={payloadLanguage(current.payloadType, current.payload)}
                resource={resource}
                schema={current.schema ?? ''}
                section={section}
                schemaLint={schemaLint}
            />
        </div>
    );
}
