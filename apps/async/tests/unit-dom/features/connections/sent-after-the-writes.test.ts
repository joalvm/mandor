import { success, type WsSendRequest } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { openSocket } from '../../../../src/renderer/features/connections/lib/open-socket.js';
import { sendMessage } from '../../../../src/renderer/features/connections/lib/send-message.js';

const SCOPE = { workspaceId: 'events' };

const CONNECTION: Connection = {
    environmentId: 'env-1',
    headers: [],
    id: 'alpha',
    name: 'Echo',
    transport: 'websocket',
    url: 'ws://127.0.0.1:1/{{ruta}}',
};

function frame(template: string): WsSendRequest {
    return {
        connectionId: 'alpha',
        itemPath: null,
        origin: null,
        template,
        workspaceId: 'events',
    };
}

/** Something typed a moment ago that is still on its way to disk, and the log of what happened. */
function typedAMomentAgo(): string[] {
    const order: string[] = [];
    const pending = createPendingWrites<string, string>(async () => {
        await Promise.resolve();
        order.push('written');
    });

    pending.schedule('dev', 'ruta');

    return order;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('what main reads from disk when a socket opens or a frame leaves', () => {
    it('opens the socket once what was just typed is written', async () => {
        const order = typedAMomentAgo();

        vi.spyOn(asyncBridge.ws, 'open').mockImplementation(() => {
            order.push('opened');

            return Promise.resolve(success({}));
        });

        await openSocket(CONNECTION, SCOPE);

        expect(order).toEqual(['written', 'opened']);
    });

    it('sends the frame once what was just typed is written', async () => {
        const order = typedAMomentAgo();

        vi.spyOn(asyncBridge.ws, 'send').mockImplementation(() => {
            order.push('sent');

            return Promise.resolve(success({}));
        });

        await sendMessage(frame('hola'));

        expect(order).toEqual(['written', 'sent']);
    });

    it('keeps the frames of a connection in the order they were sent', async () => {
        typedAMomentAgo();

        const sent: unknown[] = [];

        vi.spyOn(asyncBridge.ws, 'send').mockImplementation((request) => {
            sent.push(request);

            return Promise.resolve(success({}));
        });

        await Promise.all([sendMessage(frame('uno')), sendMessage(frame('dos'))]);

        expect(sent).toEqual([frame('uno'), frame('dos')]);
    });
});
