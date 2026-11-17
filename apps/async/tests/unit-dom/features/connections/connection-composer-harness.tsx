import type { ConnectionTransport, Environment, MessagePayloadType } from '@mandor/schema';
import { render } from '@testing-library/react';
import { type ReactNode, useState } from 'react';

import { ConnectionComposer } from '../../../../src/renderer/features/connections/components/strip/ConnectionComposer.js';
import type { ComposerEvent } from '../../../../src/renderer/events/composer-events-store.js';

import { AppProviders } from '../../support/app-providers.js';

export type HarnessProps = {
    environment?: Environment | undefined;
    event?: ComposerEvent | undefined;
    onPayloadChange?: (payload: string) => void;
    onSend?: (data: string, eventName: string) => void;
    payloadType?: MessagePayloadType;
    transport?: ConnectionTransport;
};

function Harness({
    environment,
    event,
    onPayloadChange,
    onSend,
    payloadType: declared,
    transport = 'websocket',
}: HarnessProps): ReactNode {
    const [live, setLive] = useState<ComposerEvent | undefined>(event);
    const [payloadType, setPayloadType] = useState<MessagePayloadType>(declared ?? 'json');
    const [eventName, setEventName] = useState('Saludo');

    return (
        <ConnectionComposer
            connectionId="alpha"
            environment={environment}
            event={live}
            eventName={eventName}
            onEventNameChange={setEventName}
            onExpectAckChange={() => undefined}
            onVariablesChange={() => undefined}
            onPayloadChange={
                onPayloadChange ??
                ((payload) => {
                    setLive((current) =>
                        current === undefined ? undefined : { ...current, dirty: true, payload },
                    );
                })
            }
            onPayloadTypeChange={setPayloadType}
            onSend={onSend ?? (() => undefined)}
            payloadType={payloadType}
            transport={transport}
        />
    );
}

export function mount(props: HarnessProps = {}): { draftsSent: string[] } {
    const draftsSent: string[] = [];

    render(
        <Harness {...props} onSend={props.onSend ?? ((data: string) => draftsSent.push(data))} />,
        { wrapper: AppProviders },
    );

    return { draftsSent };
}
