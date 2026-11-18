import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendFrame } from '../../../../../src/renderer/features/messages/lib/send-frame.js';
import type { OutboundFrame } from '../../../../../src/renderer/outbound/outbound-port.js';
import { registerOutboundPort } from '../../../../../src/renderer/outbound/outbound-registry.js';

const FRAME: OutboundFrame = {
    itemPath: 'pedido-creado',
    origin: 'Pedido creado',
    template: '{ "id": 1 }',
};

let off: () => void = () => undefined;

afterEach(() => {
    off();
    off = () => undefined;
});

describe('putting a frame on a wire', () => {
    it('hands the frame to the port of the app, for the target it names', async () => {
        const send = vi.fn().mockResolvedValue(undefined);

        off = registerOutboundPort({ send, subscribe: () => () => undefined, targets: () => [] });

        await sendFrame('gateway', FRAME);

        expect(send).toHaveBeenCalledWith('gateway', FRAME);
    });

    /** In an app that registered no port nothing leaves and nothing breaks. */
    it('lets the frame go nowhere when the app registered no port', async () => {
        await expect(sendFrame('gateway', FRAME)).resolves.toBeUndefined();
    });

    it('waits for the port to be done with the frame', async () => {
        let done = false;

        off = registerOutboundPort({
            send: async () => {
                await Promise.resolve();
                done = true;
            },
            subscribe: () => () => undefined,
            targets: () => [],
        });

        await sendFrame('gateway', FRAME);

        expect(done).toBe(true);
    });
});
