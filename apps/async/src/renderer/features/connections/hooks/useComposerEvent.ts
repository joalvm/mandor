import { collectionStore, itemPartsOf, itemTrail } from '@mandor/collections';
import type { CollectionNode, MessagePayloadType, ResourceUri } from '@mandor/schema';
import { useStore } from 'zustand';

import { composerEventsStore } from '../../../events/composer-events-store.js';
import { composerEventName } from '../lib/composer-event-name.js';

/**
 * The event being composed by one connection: the event itself, the trail it hangs from, and
 * the three things that can happen to it.
 *
 * The panel reads the two apart nowhere else: the format, the send and the strip all follow the
 * event, and the breadcrumb is what the band above them says about where the event came from.
 * No event is no trail, and the panel says so with one page instead of two empty halves.
 */
export function useComposerEvent(connectionId: string) {
    const composerEvent = useStore(
        composerEventsStore,
        (state) => state.byConnection[connectionId],
    );
    const collectionNodes = useStore(collectionStore, (state) => state.nodes);
    const resource = composerEvent?.eventResource ?? '';
    // The name is read back from the tree every time, so a rename lands here without the
    // composer being told: what it stored is where the event is, not what it is called.
    const eventName = composerEventName(resource, composerEvent?.eventName ?? '', collectionNodes);

    return {
        composerEvent,
        crumbs:
            composerEvent === undefined || resource === ''
                ? []
                : [...trailOf(resource, collectionNodes), eventName],
        eventName,
        onClose: (): void => {
            composerEventsStore.getState().clear(connectionId);
        },
        onPayloadChange: (payload: string): void => {
            composerEventsStore.getState().setPayload(connectionId, payload);
        },
        onSchemaChange: (schema: string): void => {
            composerEventsStore.getState().setSchema(connectionId, schema);
        },
        onPayloadTypeChange: (payloadType: MessagePayloadType): void => {
            composerEventsStore.getState().setPayloadType(connectionId, payloadType);
        },
        onExpectAckChange: (enabled: boolean): void => {
            composerEventsStore.getState().setExpectAck(connectionId, enabled);
        },
    };
}

/** The collection and the folders the event hangs from; nothing for a resource that is no item. */
function trailOf(resource: ResourceUri, nodes: readonly CollectionNode[]): string[] {
    const parts = itemPartsOf(resource);

    return parts === null ? [] : itemTrail(nodes, parts.path);
}
