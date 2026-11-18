import type { Connection } from '@mandor/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { connectionDefaultsStore } from '../../../../src/renderer/features/connections/connection-defaults-store.js';
import { FACTORY_CONNECTION_DEFAULTS } from '../../../../src/renderer/features/connections/lib/connection-settings.js';
import { sendComposerMessage } from '../../../../src/renderer/features/connections/lib/send-composer-message.js';

const sent = vi.fn<(request: unknown) => Promise<void>>(() => Promise.resolve());

vi.mock('../../../../src/renderer/features/connections/lib/send-message.js', () => ({
    sendMessage: (request: unknown) => sent(request),
}));

const CHAT: Connection = {
    id: 'chat',
    name: 'Chat',
    environmentId: 'env-1',
    transport: 'socketio',
    url: 'http://127.0.0.1:1',
    headers: [],
};

afterEach(() => {
    connectionDefaultsStore.setState({ defaults: FACTORY_CONNECTION_DEFAULTS });
});

describe('how long a send waits for its ack', () => {
    it('as long as the connection says, over the defaults of the app', () => {
        connectionDefaultsStore.setState({
            defaults: {
                ...FACTORY_CONNECTION_DEFAULTS,
                socketio: { ...FACTORY_CONNECTION_DEFAULTS.socketio, ackTimeoutMs: 2_500 },
            },
        });

        const input = {
            connectionId: 'chat',
            data: 'hola',
            event: 'chat:message',
            eventName: 'Saludo',
            itemPath: null,
            expectAck: { enabled: true, timeoutMs: 10_000 },
            payloadType: 'text',
            scope: { workspaceId: 'events' },
        } as const;

        sendComposerMessage({ ...input, connection: CHAT });
        sendComposerMessage({ ...input, connection: { ...CHAT, socketio: { ackTimeoutMs: 700 } } });

        expect(sent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ expectAck: { timeoutMs: 2_500 } }),
        );
        expect(sent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ expectAck: { timeoutMs: 700 } }),
        );
    });
});
