import type { MessagePayloadType } from '@mandor/schema';
import { movedResource, scopeToOrigin } from '@mandor/shell';
import { createStore } from 'zustand';

/** The event one connection's composer is holding, and whether it still differs from the file. */
export type ComposerEvent = {
    dirty: boolean;
    eventName: string;
    eventResource: string;
    payload: string;
    payloadType: MessagePayloadType;
    /** The JSON Schema the event carries, edited beside the payload and saved with it. */
    schema: string;
    /** Whether an emission of this event waits for the ack of the server, and for how long.
     * Free text holds no file, and with it no wait of its own. */
    expectAck?: { enabled: boolean; timeoutMs: number } | undefined;
};

type State = {
    byConnection: Record<string, ComposerEvent | undefined>;
    clear: (connectionId: string) => void;
    markSaved: (connectionId: string) => void;
    moveEvent: (from: string, to: string) => void;
    /** Puts back the draft a composer was closed with, dirty flag included. */
    restore: (connectionId: string, event: ComposerEvent) => void;
    reset: () => void;
    select: (connectionId: string, event: Omit<ComposerEvent, 'dirty'>) => void;
    setPayload: (connectionId: string, payload: string) => void;
    setSchema: (connectionId: string, schema: string) => void;
    setPayloadType: (connectionId: string, payloadType: MessagePayloadType) => void;
    setExpectAck: (connectionId: string, enabled: boolean) => void;
};

function withEvent(
    state: State,
    connectionId: string,
    change: (event: ComposerEvent) => ComposerEvent,
): Record<string, ComposerEvent | undefined> {
    const event = state.byConnection[connectionId];

    // An empty resource is the composer's free text: a draft with no file behind it yet. Its
    // format is the same default the schema writes into every event file.
    const fallback: ComposerEvent = {
        dirty: false,
        eventName: '',
        eventResource: '',
        payload: '',
        payloadType: 'json',
        schema: '',
    };

    return {
        ...state.byConnection,
        [connectionId]: change(event ?? fallback),
    };
}

/**
 * What each open connection's composer holds. The connection tab owns the composer, and the
 * event it composes is a file of the collection: typing leaves the two different until a save
 * puts them back together.
 */
export const composerEventsStore = scopeToOrigin(
    createStore<State>()((set) => ({
        byConnection: {},
        clear: (connectionId) => {
            set((state) => ({
                byConnection: { ...state.byConnection, [connectionId]: undefined },
            }));
        },
        markSaved: (connectionId) => {
            set((state) => ({
                byConnection: withEvent(state, connectionId, (event) => ({
                    ...event,
                    dirty: false,
                })),
            }));
        },
        /**
         * Follows a file that was renamed or filed elsewhere while a composer held it. The free
         * text of a composer with no file behind it has no address to follow, and is left alone.
         */
        moveEvent: (from, to) => {
            set((state) => ({
                byConnection: Object.fromEntries(
                    Object.entries(state.byConnection).map(([connectionId, event]) => [
                        connectionId,
                        event === undefined || event.eventResource === ''
                            ? event
                            : {
                                  ...event,
                                  eventResource: movedResource(event.eventResource, from, to),
                              },
                    ]),
                ),
            }));
        },
        reset: () => {
            set({ byConnection: {} });
        },
        restore: (connectionId, event) => {
            set((state) => ({
                byConnection: { ...state.byConnection, [connectionId]: event },
            }));
        },
        select: (connectionId, event) => {
            set((state) => ({
                byConnection: {
                    ...state.byConnection,
                    [connectionId]: { ...event, dirty: false },
                },
            }));
        },
        setPayload: (connectionId, payload) => {
            set((state) => ({
                byConnection: withEvent(state, connectionId, (event) => ({
                    ...event,
                    dirty: true,
                    payload,
                })),
            }));
        },
        setSchema: (connectionId, schema) => {
            set((state) => ({
                byConnection: withEvent(state, connectionId, (event) => ({
                    ...event,
                    dirty: true,
                    schema,
                })),
            }));
        },
        setPayloadType: (connectionId, payloadType) => {
            set((state) => ({
                byConnection: withEvent(state, connectionId, (event) => ({
                    ...event,
                    dirty: true,
                    payloadType,
                })),
            }));
        },
        setExpectAck: (connectionId, enabled) => {
            set((state) => ({
                byConnection: withEvent(state, connectionId, (event) => ({
                    ...event,
                    dirty: true,
                    expectAck: { enabled, timeoutMs: event.expectAck?.timeoutMs ?? 10_000 },
                })),
            }));
        },
    })),
);
