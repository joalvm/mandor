import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, render, screen } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createEnvironment, type Environment } from '@mandor/schema';

import { ConnectionComposer } from '../../../../src/renderer/features/connections/components/strip/ConnectionComposer.js';

import { AppProviders } from '../../support/app-providers.js';
import { EVENT } from './connection-composer.test-data.js';
describe('the variables of the composed payload', () => {
    it('repaints every tone when the environment in force changes', async () => {
        const withName = createEnvironment({
            id: 'local',
            name: 'local',
            variables: [{ name: 'deviceType', value: '2', enabled: true, secret: false }],
        });
        const withoutName = createEnvironment({ id: 'staging', name: 'staging' });
        let changeEnvironment: ((next: Environment | undefined) => void) | undefined;

        function Swapping(): ReactNode {
            const [inForce, setInForce] = useState<Environment | undefined>(withName);

            changeEnvironment = setInForce;

            return (
                <ConnectionComposer
                    connectionId="alpha"
                    environment={inForce}
                    event={{ ...EVENT, payload: '{"type":"{{deviceType}}"}' }}
                    eventName="Saludo"
                    onEventNameChange={() => undefined}
                    onExpectAckChange={() => undefined}
                    onPayloadChange={() => undefined}
                    onPayloadTypeChange={() => undefined}
                    onSend={() => undefined}
                    onVariablesChange={() => undefined}
                    payloadType="json"
                    transport="websocket"
                />
            );
        }

        render(<Swapping />, { wrapper: AppProviders });

        const editor = await editorAt(0, screen.getByRole('group', { name: 'Message composer' }));

        expect(editor.tones()).toEqual(['resolved']);

        act(() => {
            changeEnvironment?.(withoutName);
        });

        expect(editor.tones()).toEqual(['missing']);
    });
});
