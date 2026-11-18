import { z } from 'zod';

import type { ConnectionTransport } from './connection-transport.js';

// The scheme check lives in a pattern, not in z.url(), so the published JSON Schema carries it
// too. A url may carry `{{var}}` templates: what they resolve to is judged once, at dial time,
// so a url that carries one is held to the scheme alone and the pair is checked with it.
const SCHEME = /^wss?:\/\/|^https?:\/\//;
const HAS_TEMPLATE = /\{\{[^{}]*\}\}/;

export const connectionUrlSchema = z
    .string()
    .regex(SCHEME)
    .refine((value) => HAS_TEMPLATE.test(value) || URL.canParse(value));

const SCHEMES: Record<ConnectionTransport, RegExp> = {
    socketio: /^https?:\/\//,
    websocket: /^wss?:\/\//,
};

/** Whether the url speaks the scheme the transport dials. */
export function urlMatchesTransport(transport: ConnectionTransport, url: string): boolean {
    return SCHEMES[transport].test(url);
}
