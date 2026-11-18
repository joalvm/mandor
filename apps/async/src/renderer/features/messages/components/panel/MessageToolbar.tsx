import { useMessages } from '@mandor/i18n';
import { MESSAGE_PAYLOAD_TYPES, type MessagePayloadType } from '@mandor/schema';
import { Input, Select } from '@mandor/ui';

import type { OutboundTarget } from '../../../../outbound/outbound-port.js';

import { MessageSend } from '../strip/MessageSend.js';
import { MessageDestination } from './MessageDestination.js';

/** i18next reads `_` as a context separator, so each label gets a key of its own. */
const PAYLOAD_TYPE_KEYS = {
    binary: 'payloadTypeBinary',
    json: 'payloadTypeJson',
    text: 'payloadTypeText',
} as const;

type MessageToolbarProps = {
    channel: string;
    onChannelChange: (channel: string) => void;
    onPayloadTypeChange: (payloadType: MessagePayloadType) => void;
    onSend: (target: OutboundTarget) => void;
    payloadType: MessagePayloadType;
    targets: () => OutboundTarget[];
};

/**
 * What the message goes out on, and how it is meant to be read. The tree has no room for either
 * and a row that showed neither would lie by omission.
 */
export function MessageToolbar({
    channel,
    onChannelChange,
    onPayloadTypeChange,
    onSend,
    payloadType,
    targets,
}: MessageToolbarProps) {
    const messages = useMessages('messages');

    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="message-toolbar"
        >
            <Input
                className="min-w-0 flex-1"
                label={messages('channelLabel')}
                onValueChange={onChannelChange}
                placeholder={messages('noChannel')}
                value={channel}
            />
            <Select
                className="w-36 shrink-0"
                label={messages('payloadTypeLabel')}
                onValueChange={onPayloadTypeChange}
                options={MESSAGE_PAYLOAD_TYPES.map((value) => ({
                    label: messages(PAYLOAD_TYPE_KEYS[value]),
                    value,
                }))}
                value={payloadType}
            />
            <MessageDestination />
            <MessageSend onSend={onSend} targets={targets} />
        </div>
    );
}
