import {
    claimRoute,
    definedOnly,
    fingerprintOf,
    nameOr,
    type ImportResource,
    type TakenRoutes,
} from '@mandor/interop-core';

import type { BrunoMessage, BrunoWebSocket } from '../document/bruno-tree.js';
import { originOf } from './origin-of.js';

/** Where the messages of a request land: the folder it hung from, and the routes taken there. */
export type MessageSpot = { sourceId: string; parent: string; taken: TakenRoutes };

/** How Mandor types what Bruno does: XML is text, and anything it does not know is text too. */
const PAYLOAD_TYPES = new Map([
    ['json', 'json'],
    ['binary', 'binary'],
]);

/** A message is called by its title after the request; one with none takes the request's name. */
function nameOfMessage(request: string, message: BrunoMessage, count: number, at: number): string {
    if (message.title !== '') {
        return `${request}: ${message.title}`;
    }

    return count === 1 ? request : `${request} ${String(at + 1)}`;
}

/**
 * The messages a WebSocket request keeps saved, as messages of the collection: they have no
 * destination, and whichever connection is open sends them. A message that says nothing is not one.
 */
export function messageResourcesOf(socket: BrunoWebSocket, spot: MessageSpot): ImportResource[] {
    const request = nameOr(socket.name, 'WebSocket');
    const saved = socket.messages.filter((message) => message.data !== '');

    return saved.map((message, at) => {
        const name = nameOfMessage(request, message, saved.length, at);
        const fields = definedOnly({
            payload: message.data,
            payloadType: PAYLOAD_TYPES.get(message.type) ?? 'text',
        });

        return {
            place: 'item',
            itemKind: 'message',
            route: claimRoute(spot.taken, spot.parent, name, 'message'),
            name,
            fields,
            origin: originOf(spot.sourceId, fingerprintOf({ name, ...fields })),
            degradations: [],
        };
    });
}
