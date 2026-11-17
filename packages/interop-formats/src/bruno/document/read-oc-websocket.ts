import type { z } from 'zod';

import type { BrunoMessage, BrunoWebSocket } from './bruno-tree.js';
import { leftOutOf } from './left-out-of.js';
import type { websocketSchema } from './opencollection-schema.js';
import { sequenceOf } from './order-nodes.js';
import { authOfOpenCollection } from './read-oc-auth.js';
import { noteOf, type OcItem } from './read-oc-request.js';
import { rowsOf } from './read-oc-parts.js';

type Saved = z.output<typeof websocketSchema>['message'];

/** The messages a request keeps: the one it has, or the variants it offers, each with a title. */
function messagesOf(saved: Saved): BrunoMessage[] {
    if (saved === null || saved === undefined) {
        return [];
    }

    if (Array.isArray(saved)) {
        return saved.map((variant) => ({
            title: variant.title ?? '',
            type: variant.message?.type ?? 'text',
            data: variant.message?.data ?? '',
        }));
    }

    return [{ title: '', type: saved.type ?? 'text', data: saved.data ?? '' }];
}

/** The WebSocket request an item is; nothing when the item has no `websocket` part. */
export function websocketOf(item: OcItem, name: string): BrunoWebSocket | undefined {
    const { websocket } = item;

    if (websocket === null || websocket === undefined) {
        return undefined;
    }

    return {
        kind: 'websocket',
        name,
        seq: sequenceOf(item.info?.seq),
        url: websocket.url ?? '',
        description: noteOf(item),
        headers: rowsOf(websocket.headers),
        auth: authOfOpenCollection(websocket.auth),
        messages: messagesOf(websocket.message),
        leftOut: leftOutOf({
            scripts: item.runtime?.scripts,
            settings: item.settings,
            'request variables': item.runtime?.variables,
            tags: item.info?.tags,
        }),
    };
}
