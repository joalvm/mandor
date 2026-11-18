import { z } from 'zod';

/**
 * How a connection opens. Every field stands alone: a file may name one and not the others, and
 * what is absent is the default. A server that takes the connection and never answers the
 * handshake is given up once the timeout passes, instead of holding the attempt forever.
 */
export type HandshakeOptions = {
    /** How long the opening handshake may take before the attempt fails. */
    timeoutMs?: number | undefined;
};

export const handshakeOptionsSchema = z.object({
    timeoutMs: z.number().int().min(1).max(600_000).optional(),
});

/** What a connection without options of its own opens with. */
export const DEFAULT_HANDSHAKE_OPTIONS = {
    timeoutMs: 20_000,
} satisfies HandshakeOptions;
