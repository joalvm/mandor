import { z } from 'zod';

/**
 * The settings a websocket connection carries beside its url. Every field stands alone: a file
 * may name one and not the others, and what is absent is the default, so a hand-written file
 * stays readable no matter which half of it was edited.
 */
export type WebsocketOptions = {
    /** Largest inbound frame accepted, in KiB; a bigger one closes the connection. */
    maximumMessageSizeKiB?: number | undefined;
    /** Protocols offered in the opening handshake, in the order they are offered. */
    subprotocols?: string[] | undefined;
    /** Whether wss validates the server certificate. Off is a decision, never a default. */
    verifyCertificate?: boolean | undefined;
    /**
     * JSON the outgoing message is wrapped in, with `{{event}}` and `{{payload}}` as the
     * holes. Absent, the message leaves as it is: the envelope of the backend is a decision
     * of this connection, never a default.
     */
    frame?: string | undefined;
};

// A subprotocol is an RFC 7230 token: no spaces, no separators a handshake could choke on.
export const SUBPROTOCOL_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u;

/** Largest inbound frame a socket may be set to take, in KiB; past it, memory is the limit. */
export const maximumMessageSizeKiBSchema = z.number().int().positive().max(262_144);

/** The frame a socket takes while nothing says otherwise: the ceiling `ws` ships with. */
export const DEFAULT_MAXIMUM_MESSAGE_SIZE_KIB = 102_400;

export const websocketOptionsSchema = z.object({
    maximumMessageSizeKiB: maximumMessageSizeKiBSchema.optional(),
    subprotocols: z.array(z.string().regex(SUBPROTOCOL_PATTERN)).max(8).optional(),
    verifyCertificate: z.boolean().optional(),
    frame: z.string().max(65_536).optional(),
});

/** What a connection without options of its own dials with. */
export const DEFAULT_WEBSOCKET_OPTIONS = {
    maximumMessageSizeKiB: DEFAULT_MAXIMUM_MESSAGE_SIZE_KIB,
    subprotocols: [],
    verifyCertificate: true,
} satisfies WebsocketOptions;
