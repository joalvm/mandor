import type { Connection } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendComposerMessage } from '../../../../src/renderer/features/connections/lib/send-composer-message.js';

const sendMessage = vi.fn<(request: unknown) => Promise<void>>(() => Promise.resolve());

vi.mock('../../../../src/renderer/features/connections/lib/send-message.js', () => ({
    sendMessage: (request: unknown) => sendMessage(request),
}));

const CONNECTION: Connection = {
    environmentId: 'env-1',
    headers: [],
    id: 'alpha',
    name: 'Echo',
    transport: 'websocket',
    url: 'ws://127.0.0.1:1',
};

const SCOPE = { workspaceId: 'events' };

beforeEach(() => {
    sendMessage.mockClear();
});

describe('sending what the composer holds', () => {
    it('sends through the connection and signs the frame with the event', () => {
        const sent = sendComposerMessage({
            connection: CONNECTION,
            connectionId: 'alpha',
            data: 'hola',
            eventName: 'Saludo',
            itemPath: null,
            event: 'chat:message',
            payloadType: 'text',
            scope: SCOPE,
        });

        expect(sent).toBe(true);
        expect(sendMessage).toHaveBeenCalledWith({
            connectionId: 'alpha',
            origin: 'Saludo',
            itemPath: null,
            template: 'hola',
            workspaceId: 'events',
            event: 'chat:message',
        });
    });

    it('cleans the comments and the trailing comma out of a json payload before the frame leaves', () => {
        sendComposerMessage({
            connection: CONNECTION,
            connectionId: 'alpha',
            data: '{\n  // hola\n  "a": 1,\n}',
            eventName: 'Saludo',
            itemPath: null,
            event: 'chat:message',
            payloadType: 'json',
            scope: SCOPE,
        });

        expect(sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ template: '{\n  \n  "a": 1\n}' }),
        );
    });

    it('sends free text anonymous, because it came from nowhere in the collection', () => {
        sendComposerMessage({
            connection: CONNECTION,
            connectionId: 'alpha',
            data: 'hola',
            eventName: '',
            itemPath: null,
            event: '',
            payloadType: 'text',
            scope: SCOPE,
        });

        expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ origin: null }));
    });

    it('wraps the frame with the template of the websocket that declared one', () => {
        sendComposerMessage({
            connection: {
                ...CONNECTION,
                websocket: { frame: '{"event": {{event}}, "data": {{payload}}}' },
            },
            connectionId: 'alpha',
            data: 'hola',
            eventName: 'Saludo',
            itemPath: null,
            event: '',
            payloadType: 'text',
            scope: SCOPE,
        });

        expect(sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ frame: '{"event": {{event}}, "data": {{payload}}}' }),
        );
    });

    it('wraps nothing when the connection declared no template, even over Socket.IO', () => {
        sendComposerMessage({
            connection: { ...CONNECTION, transport: 'socketio' },
            connectionId: 'alpha',
            data: 'hola',
            eventName: 'Saludo',
            itemPath: null,
            event: 'chat:message',
            payloadType: 'text',
            scope: SCOPE,
        });

        const request = sendMessage.mock.calls[0]?.[0] as { frame?: string };

        expect('frame' in request).toBe(false);
    });

    it('refuses an empty frame', () => {
        expect(
            sendComposerMessage({
                connection: CONNECTION,
                connectionId: 'alpha',
                data: '',
                eventName: 'Saludo',
                itemPath: null,
                event: '',
                payloadType: 'text',
                scope: SCOPE,
            }),
        ).toBe(false);
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('refuses when the workspace scope is not known yet', () => {
        expect(
            sendComposerMessage({
                connection: CONNECTION,
                connectionId: 'alpha',
                data: 'hola',
                eventName: 'Saludo',
                itemPath: null,
                event: '',
                payloadType: 'text',
                scope: null,
            }),
        ).toBe(false);
        expect(sendMessage).not.toHaveBeenCalled();
    });
});
