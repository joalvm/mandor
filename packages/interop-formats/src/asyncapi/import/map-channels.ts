import type { AsyncAPIDocumentInterface } from '@asyncapi/parser';
import type { InteropChannel } from '@mandor/interop-core';

import { rawNamed } from './map-servers.js';
import { unknownKeys } from '../document/unknown-keys.js';

const KNOWN = [
    'description',
    'publish',
    'subscribe',
    'address',
    'messages',
    'servers',
    'parameters',
];

/**
 * Every address the traffic travels. The document's own name for the channel becomes the IR
 * name — it is what the folder will be called — and the wire address travels apart, because in
 * 3.x the two stopped being the same word. Bindings and anything unclaimed stay in `extras`.
 */
export function channelsOf(
    document: AsyncAPIDocumentInterface,
    raw: Record<string, unknown>,
): InteropChannel[] {
    return document
        .channels()
        .all()
        .map((channel) => {
            const rawChannel = rawNamed(raw, 'channels', channel.id());

            return {
                name: channel.id(),
                address: channel.address() ?? channel.id(),
                description: channel.description(),
                extras: rawChannel === undefined ? {} : unknownKeys(rawChannel, KNOWN),
            };
        });
}
