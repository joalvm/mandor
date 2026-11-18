import type { BruRequest } from './bru-schema.js';
import type { BrunoMessage, BrunoWebSocket } from './bruno-tree.js';
import { leftOutOf } from './left-out-of.js';
import { sequenceOf } from './order-nodes.js';
import { authOfBru } from './read-bru-auth.js';
import { rowsOfBru } from './read-bru-rows.js';

function messagesOf(request: BruRequest): BrunoMessage[] {
    return (request.body?.ws ?? []).map((message) => ({
        title: message.name ?? '',
        type: message.type ?? 'text',
        data: message.content ?? '',
    }));
}

/** The WebSocket request a `.bru` file holds: its `ws` block, its headers and its messages. */
export function websocketOfBru(request: BruRequest, name: string): BrunoWebSocket {
    return {
        kind: 'websocket',
        name,
        seq: sequenceOf(request.meta?.seq),
        url: request.ws?.url ?? '',
        description: request.docs ?? '',
        headers: rowsOfBru(request.headers),
        auth: authOfBru(request.ws?.auth, request.auth),
        messages: messagesOf(request),
        leftOut: leftOutOf({
            scripts: request.script,
            tests: request.tests,
            'request variables': request.vars,
            tags: request.meta?.tags,
        }),
    };
}
