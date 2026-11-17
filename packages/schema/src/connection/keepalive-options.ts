import { z } from 'zod';

/**
 * Whether a connection proves it is still alive while nothing is being said. Every field stands
 * alone: a file may name one and not the others, and what is absent is the default. A pong that
 * does not arrive within the timeout takes the connection for dropped, whatever the socket
 * believes.
 */
export type KeepaliveOptions = {
    /** Whether the connection pings at all. */
    enabled?: boolean | undefined;
    /** How long the line stays quiet before a ping goes out. */
    intervalMs?: number | undefined;
    /** How long a pong may take to answer before the connection is taken as dropped. */
    pongTimeoutMs?: number | undefined;
};

export const keepaliveOptionsSchema = z.object({
    enabled: z.boolean().optional(),
    intervalMs: z.number().int().min(1).max(86_400_000).optional(),
    pongTimeoutMs: z.number().int().min(1).max(3_600_000).optional(),
});

/** What a connection without options of its own keeps alive by. Off, until somebody asks. */
export const DEFAULT_KEEPALIVE_OPTIONS = {
    enabled: false,
    intervalMs: 30_000,
    pongTimeoutMs: 10_000,
} satisfies KeepaliveOptions;
