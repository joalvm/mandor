import type { OutboundFrame } from '../../../outbound/outbound-port.js';
import { outboundPort } from '../../../outbound/outbound-registry.js';

/**
 * Hands the frame to whatever this app knows how to put on a wire. The collection does not know
 * what a socket is, and in an app that registered no port nothing leaves and nothing breaks.
 */
export async function sendFrame(targetId: string, frame: OutboundFrame): Promise<void> {
    await outboundPort()?.send(targetId, frame);
}
