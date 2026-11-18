/** A connection a frame can leave through, as whoever wrote the frame needs to see it. */
export type OutboundTarget = {
    id: string;
    name: string;
    /** Whether the socket is live. A connection that is not gets opened before the frame goes. */
    live: boolean;
    /** What it resolves against: the environment of the connection, or none. */
    environmentId: string | null;
};

/** One frame on its way out: the template as it was written, and what it was written in. */
export type OutboundFrame = {
    template: string;
    /** The collection item this came from, so the timeline can name it. */
    origin: string;
    /** Where that item sits in the collection, so main resolves it with its folders. */
    itemPath: string | null;
    /**
     * The schema the payload promises to meet, when it carries one. Main is who checks the
     * frame it resolved, and the timeline mark is that answer.
     */
    schema?: string | undefined;
};

/**
 * How a frame reaches a socket without the feature that wrote it knowing what a socket is.
 * Connections registers the port and messages consumes it: two features of Async, and neither
 * imports the other. The apps never import each other either, so Sync has no way to put a port
 * here; a request that sends has its own way out inside Sync.
 */
export type OutboundPort = {
    /** Every connection of the workspace, the live ones first. */
    targets: () => OutboundTarget[];
    /** Calls back whenever the answer of `targets` may have changed, until the call it returns. */
    subscribe: (listener: () => void) => () => void;
    /** Sends the frame, opening the connection first when it is not live. */
    send: (targetId: string, frame: OutboundFrame) => Promise<void>;
};
