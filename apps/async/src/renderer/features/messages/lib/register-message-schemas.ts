import { collectionStore, itemResource } from '@mandor/collections';
import { MESSAGE_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { originName, shellStore } from '@mandor/shell';

import { registerInboundSchemas } from '../../../activity/inbound-schema.js';
import { loadMessage } from './load-message.js';
import { messagesStore } from '../messages-store.js';

/**
 * Teaches the activity timeline which message owns a channel, and what schema it carries. The
 * messages of the workspace are read on demand — the first inbound frame of a channel pays one
 * read per message until the channel answers — and what was read stays in the store, so the
 * second frame of the same channel asks nothing. A channel no message declares is remembered as
 * silence: the timeline judges nothing, and stops asking.
 */
export function registerMessageSchemas(): () => void {
    const missing = new Set<string>();

    return registerInboundSchemas({
        schemaForChannel: async (channel: string): Promise<string | undefined> => {
            const loaded = schemaOfChannel(channel);

            if (loaded !== undefined) {
                return loaded;
            }

            if (missing.has(channel)) {
                return undefined;
            }

            for (const node of messageNodes()) {
                const resource = resourceOf(node.path);

                await loadMessage(resource);

                const message = messagesStore.getState().messages[resource];

                if (message?.channel === channel) {
                    return message.schema;
                }
            }

            missing.add(channel);

            return undefined;
        },
    });
}

function schemaOfChannel(channel: string): string | undefined {
    for (const message of Object.values(messagesStore.getState().messages)) {
        if (message.channel === channel) {
            return message.schema;
        }
    }

    return undefined;
}

function messageNodes(): { path: string }[] {
    const nodes = collectionStore.getState().nodes;
    const found: { path: string }[] = [];

    for (const node of nodes) {
        collectMessageNodes(node, found);
    }

    return found;
}

function collectMessageNodes(node: CollectionNode, found: { path: string }[]): void {
    if (node.kind !== 'item') {
        for (const child of node.children) {
            collectMessageNodes(child, found);
        }

        return;
    }

    if (node.itemKind === MESSAGE_ITEM_KIND) {
        found.push({ path: node.path });
    }
}

function resourceOf(path: string): string {
    const workspaceId = shellStore.getState().activeWorkspaceId ?? '';

    return itemResource(originName(), workspaceId, path);
}
