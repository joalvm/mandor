import { ItemPlaceContext } from '@mandor/env';
import { SendIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import {
    type ConnectionTransport,
    type Environment,
    itemParentOf,
    type MessagePayloadType,
    type Variable,
} from '@mandor/schema';
import type { TemplateIssue } from '@mandor/validate';
import {
    Button,
    Tabs,
    TabsList,
    TabsPanel,
    TabsStrip,
    TabsTab,
    useSchemaChecker,
    useSettledValue,
} from '@mandor/ui';
import { useMemo, useState } from 'react';

import { DEFAULT_CONNECTION_SECTION } from '../../lib/connection-section.js';
import { eventVerdict } from '../../../../outbound/schema-verdict.js';
import type { ComposerEvent } from '../../../../events/composer-events-store.js';
import { itemPathOfResource } from '../../../../events/item-path-of-resource.js';

import { ConnectionComposer } from './ConnectionComposer.js';
import { ConnectionDescription } from './ConnectionDescription.js';
import { ConnectionSchema } from './ConnectionSchema.js';

type ConnectionStripProps = {
    connectionId: string;
    description: string;
    /** The environment the connection resolves its variables against. */
    environment: Environment | undefined;
    /** The event the composer holds. A connection with none shows no strip at all. */
    event: ComposerEvent | undefined;
    /** The name of the event in the collection, the one the field of the composer starts from. */
    eventName: string;
    onDescriptionChange: (description: string) => void;
    onExpectAckChange: (enabled: boolean) => void;
    onPayloadChange: (payload: string) => void;
    onSchemaChange: (schema: string) => void;
    onPayloadTypeChange: (payloadType: MessagePayloadType) => void;
    onSectionChange: (section: string) => void;
    onSend: (data: string, eventName: string) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    section: string;
    payloadType: MessagePayloadType;
    transport: ConnectionTransport;
};

/**
 * The strip of the item: what it is for, and what is being sent. Every section stays mounted,
 * so reading the description never costs the event that was half written next to it. The
 * actions over the composer — sending — sit at the end of the strip, beside the sections and
 * never inside one. The configuration of the connection is not a section here anymore: it is
 * reached from the row of the collection, which is where the connection is found.
 */
export function ConnectionStrip({
    connectionId,
    description,
    environment,
    event,
    eventName,
    onDescriptionChange,
    onExpectAckChange,
    onPayloadChange,
    onSchemaChange,
    onPayloadTypeChange,
    onSectionChange,
    onSend,
    onVariablesChange,
    section,
    payloadType,
    transport,
}: ConnectionStripProps) {
    const messages = useMessages('connections');
    /** What the field of the composer says; null keeps the name of the collection on screen. */
    const [draft, setDraft] = useState<{ resource: string; value: string } | null>(null);
    const eventResource = event?.eventResource ?? '';
    const shownEventName =
        draft !== null && draft.resource === eventResource ? draft.value : eventName;
    // A window that last saw this resource on a section the strip no longer carries answers
    // with the one it is for.
    const open =
        section === 'description' || section === 'payload' || section === 'schema'
            ? section
            : DEFAULT_CONNECTION_SECTION;
    const checked = useSchemaChecker();
    // Read once the typing pauses: parsing a payload of megabytes at every key lagged it.
    const settled = useSettledValue(event, eventResource);
    const broken = useMemo(
        () => (checked ? eventVerdict(settled, payloadType) : []),
        [checked, settled, payloadType],
    );

    function send(): void {
        onSend(event === undefined ? '' : event.payload, shownEventName);
    }

    return (
        <div className="flex h-full min-h-0 flex-col" data-part="connection-strip">
            <Tabs onValueChange={onSectionChange} value={open}>
                <TabsStrip>
                    <TabsList label={messages('sections')}>
                        <TabsTab label={messages('description')} value="description" />
                        <TabsTab
                            dirty={event?.dirty === true}
                            label={messages('payload')}
                            value="payload"
                        />
                        <SchemaTab broken={broken} event={event} label={messages('schemaPane')} />
                    </TabsList>
                    <Button onClick={send} variant="primary">
                        <SendIcon size="sm" />
                        {messages('send')}
                    </Button>
                </TabsStrip>
                <TabsPanel value="description">
                    <ConnectionDescription
                        connectionId={connectionId}
                        onChange={onDescriptionChange}
                        value={description}
                    />
                </TabsPanel>
                <TabsPanel value="payload">
                    {/* An item loaded in the composer resolves with the chain of its folder. */}
                    <ItemPlaceContext value={itemParentOf(itemPathOfResource(eventResource))}>
                        <ConnectionComposer
                            connectionId={connectionId}
                            environment={environment}
                            event={event}
                            eventName={shownEventName}
                            onEventNameChange={(value) => {
                                setDraft({ resource: eventResource, value });
                            }}
                            onExpectAckChange={onExpectAckChange}
                            onPayloadChange={onPayloadChange}
                            onPayloadTypeChange={onPayloadTypeChange}
                            onSend={send}
                            onVariablesChange={onVariablesChange}
                            payloadType={payloadType}
                            transport={transport}
                        />
                    </ItemPlaceContext>
                </TabsPanel>
                <TabsPanel value="schema">
                    <ConnectionSchema
                        broken={broken}
                        connectionId={connectionId}
                        event={event}
                        onSchemaChange={onSchemaChange}
                        payloadType={payloadType}
                    />
                </TabsPanel>
            </Tabs>
        </div>
    );
}

type SchemaTabProps = {
    broken: readonly TemplateIssue[];
    event: ComposerEvent | undefined;
    label: string;
};

/** The tab of the schema points at what the payload breaks, or at a schema it keeps. */
function SchemaTab({ broken, event, label }: SchemaTabProps) {
    const written = event !== undefined && event.schema.trim() !== '';

    return (
        <TabsTab
            broken={broken.length > 0}
            filled={written && broken.length === 0}
            label={label}
            value="schema"
        />
    );
}
