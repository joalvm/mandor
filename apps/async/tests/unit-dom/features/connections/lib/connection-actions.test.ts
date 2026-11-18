import { describe, expect, it, vi } from 'vitest';

import { connectionActions } from '../../../../../src/renderer/features/connections/lib/connection-actions.js';
import { openSocket } from '../../../../../src/renderer/features/connections/lib/open-socket.js';
import { sendComposerMessage } from '../../../../../src/renderer/features/connections/lib/send-composer-message.js';
import { requestConnectionToggle } from '../../../../../src/renderer/features/connections/lib/toggle-connection.js';

vi.mock('../../../../../src/renderer/features/connections/lib/send-composer-message.js', () => ({
    sendComposerMessage: vi.fn(),
}));
vi.mock('../../../../../src/renderer/features/connections/lib/open-socket.js', () => ({
    openSocket: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../../../../../src/renderer/features/connections/lib/toggle-connection.js', () => ({
    requestConnectionToggle: vi.fn(),
}));

const COMPOSER_EVENT = {
    dirty: false,
    eventName: 'Saludo',
    eventResource: 'mandor://demo/events/item/message/saludo',
    expectAck: { enabled: true, timeoutMs: 500 },
    payload: '',
    payloadType: 'json',
    schema: '',
} as const;

function actionsOf(changes: Record<string, unknown> = {}) {
    const input = {
        composerEvent: undefined,
        connection: { id: 'alpha' } as never,
        connectionId: 'alpha',
        eventName: 'Saludo',
        live: false,
        notify: vi.fn(),
        payloadType: 'json' as const,
        scope: { workspaceId: 'events' },
        translate: vi.fn(),
        ...changes,
    };

    return connectionActions(input as never);
}

describe('the actions of one connection', () => {
    it('opens the socket past its scripts, in the workspace it is in', () => {
        actionsOf().onConnectWithoutScripts();

        expect(openSocket).toHaveBeenCalledWith(
            { id: 'alpha' },
            { workspaceId: 'events' },
            { skipScripts: true },
        );
    });

    it('opens nothing past the scripts while no workspace is open', () => {
        vi.mocked(openSocket).mockClear();
        actionsOf({ scope: null }).onConnectWithoutScripts();

        expect(openSocket).not.toHaveBeenCalled();
    });

    it('sends with the event it goes to and the ack the composer waits for', () => {
        const { onSend } = actionsOf({ composerEvent: COMPOSER_EVENT });

        onSend('hola', 'chat:message');

        expect(sendComposerMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'chat:message',
                expectAck: { enabled: true, timeoutMs: 500 },
            }),
        );
    });

    it('sends fire and forget when the composer holds free text', () => {
        const { onSend } = actionsOf();

        onSend('hola', '');

        expect(sendComposerMessage).toHaveBeenCalledWith(
            expect.objectContaining({ expectAck: undefined, eventName: '' }),
        );
    });

    it('toggles with the connection and the live state', () => {
        const notify = vi.fn();
        const translate = vi.fn();
        const { onToggle } = actionsOf({ live: true, notify, translate });

        onToggle();

        expect(requestConnectionToggle).toHaveBeenCalledWith(
            expect.objectContaining({ live: true, notify, translate }),
        );
    });
});
