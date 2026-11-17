import { collectionStore, nodeAt } from '@mandor/collections';
import {
    type MessagePayloadType,
    parseCollectionItem,
    parseMessageItem,
    parseResourceUri,
} from '@mandor/schema';
import {
    fireAndForget,
    selectActiveTabId,
    selectGroupOfTab,
    selectTabs,
    shellStore,
} from '@mandor/shell';

import { asyncBridge } from '../app/async-bridge.js';
import { composerEventsStore } from './composer-events-store.js';

/**
 * Async composes its events inside the connection that sends them: choosing an event in the
 * tree loads it into the composer of the connection the user is working in, instead of opening
 * a tab of its own. The connection the user is working in is the active tab of the focused
 * group when it is a connection; any other connection tab of the group comes after. With no
 * connection open, the event has nowhere to land and the caller opens the tab it always did.
 */
export function openEventInComposer(resource: string): boolean {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace') {
        return false;
    }

    const shell = shellStore.getState();
    const connections = selectTabs(shell).filter((tab) => tab.kind === 'connection');
    const target = connections.find((tab) => tab.id === selectActiveTabId(shell)) ?? connections[0];

    if (target === undefined) {
        return false;
    }

    const node = nodeAt(collectionStore.getState().nodes, parts.path);

    if (node?.kind !== 'item') {
        return false;
    }

    fireAndForget(
        load({
            connectionId: target.id,
            name: node.name,
            path: parts.path,
            resource,
            workspaceId: parts.workspace,
        }),
    );

    return true;
}

async function load(input: {
    connectionId: string;
    name: string;
    path: string;
    resource: string;
    workspaceId: string;
}): Promise<void> {
    const result = await asyncBridge.collections.readItem({
        path: input.path,
        workspaceId: input.workspaceId,
    });

    let payload = '';
    let payloadType: MessagePayloadType = 'json';
    let schema = '';
    let expectAck = { enabled: false, timeoutMs: 10_000 };

    if (result.ok) {
        try {
            const item = parseMessageItem(parseCollectionItem(result.value));

            payload = item.payload;
            payloadType = item.payloadType;
            schema = item.schema ?? '';
            expectAck = item.expectAck ?? expectAck;
        } catch {
            payload = '';
        }
    }

    // The tab could have closed while the file was being read; a composer nobody sees is
    // nobody's to fill.
    const group = selectGroupOfTab(shellStore.getState(), input.connectionId);

    if (group === null) {
        return;
    }

    shellStore.getState().setActiveTab(group, input.connectionId);
    composerEventsStore.getState().select(input.connectionId, {
        eventName: input.name,
        eventResource: input.resource,
        payload,
        payloadType,
        schema,
        expectAck,
    });
}
