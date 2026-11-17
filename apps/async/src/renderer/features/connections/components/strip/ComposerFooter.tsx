import { useMessages } from '@mandor/i18n';
import type { ConnectionTransport, MessagePayloadType } from '@mandor/schema';
import { Button, Checkbox, Input, Select } from '@mandor/ui';
import type { ReactNode } from 'react';

/** What the selector shows for each type: it offers text and JSON, and bytes are typed as text. */
const SHOWN_LANGUAGE: Readonly<Record<MessagePayloadType, 'json' | 'text'>> = {
    binary: 'text',
    json: 'json',
    text: 'text',
};

type ComposerFooterProps = {
    /** How the panel reads what the composer holds; the selector writes it. */
    onPayloadTypeChange: (payloadType: MessagePayloadType) => void;
    onBeautify: () => void;
    payloadType: MessagePayloadType;
    transport: ConnectionTransport;
    /** The event an emission goes to, editable when the transport names its events. */
    eventName: string;
    onEventNameChange: (eventName: string) => void;
    /** Whether an emission of this event waits for the ack of the server. */
    expectAckEnabled: boolean;
    onExpectAckChange: (enabled: boolean) => void;
};

/**
 * The foot of the composer: what an emission is made of — the event it goes to, and whether it
 * waits for an answer, when the transport speaks names — and how the payload is read, with the
 * one word that tidies it. The word carries no glyph and no box of its own — an action said in
 * the accent, the way a suggestion reads, not the way a command that changes state does.
 */
export function ComposerFooter({
    onPayloadTypeChange,
    onBeautify,
    payloadType,
    transport,
    eventName,
    onEventNameChange,
    expectAckEnabled,
    onExpectAckChange,
}: ComposerFooterProps): ReactNode {
    const messages = useMessages('connections');

    return (
        <div
            className="flex h-section shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="composer-footer"
        >
            <NamedEventFields
                eventName={eventName}
                expectAckEnabled={expectAckEnabled}
                onEventNameChange={onEventNameChange}
                onExpectAckChange={onExpectAckChange}
                transport={transport}
            />
            <div className="ml-auto flex items-center gap-gap-control">
                <Select
                    className="shrink-0"
                    label={messages('composerLanguage')}
                    onValueChange={onPayloadTypeChange}
                    options={[
                        { label: messages('composerLanguageText'), value: 'text' },
                        { label: messages('composerLanguageJson'), value: 'json' },
                    ]}
                    value={SHOWN_LANGUAGE[payloadType]}
                />
                {/* The format the user declared is what decides: the button does not read the text. */}
                <Button
                    disabled={payloadType !== 'json'}
                    onClick={onBeautify}
                    size="sm"
                    underlined={false}
                    variant="link"
                >
                    {messages('beautify')}
                </Button>
            </div>
        </div>
    );
}

type NamedEventFieldsProps = Pick<
    ComposerFooterProps,
    'eventName' | 'expectAckEnabled' | 'onEventNameChange' | 'onExpectAckChange' | 'transport'
>;

/** The event an emission goes to and its ack: only a transport that names its events has them. */
function NamedEventFields({
    eventName,
    expectAckEnabled,
    onEventNameChange,
    onExpectAckChange,
    transport,
}: NamedEventFieldsProps) {
    const messages = useMessages('connections');

    if (transport !== 'socketio') {
        return null;
    }

    return (
        <>
            <Input
                className="h-field w-40 shrink-0 font-mono"
                label={messages('eventName')}
                onValueChange={onEventNameChange}
                value={eventName}
            />
            <Checkbox
                checked={expectAckEnabled}
                label={messages('ackSetting')}
                onCheckedChange={onExpectAckChange}
            />
            <span className="text-xs text-text-secondary">{messages('ackSetting')}</span>
        </>
    );
}
