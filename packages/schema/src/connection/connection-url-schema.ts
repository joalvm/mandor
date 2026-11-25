import { z } from 'zod';

import type { ConnectionTransport } from './connection-transport.js';

// The scheme check lives in a pattern, not in z.url(), so the published JSON Schema carries it
// too. A url may carry `{{var}}` templates: what they resolve to is judged once, at dial time,
// so a url that carries one is held to the scheme alone and the pair is checked with it. A url
// that opens with a template takes its scheme from the environment, as `{{protocol}}://…` or
// `{{base_url}}/socket` do: nothing about it can be judged before the dial, which checks the
// scheme it resolved to. A url may also be empty: a connection is born with nothing in its
// address bar, and the dial is what refuses a url that says nowhere, never the file that keeps it.
const SCHEME = /^$|^\{\{[^{}]*\}\}|^wss?:\/\/|^https?:\/\//;
const HAS_TEMPLATE = /\{\{[^{}]*\}\}/;
const SCHEME_FROM_VARIABLE = /^\{\{[^{}]*\}\}/;

export const connectionUrlSchema = z
    .string()
    .regex(SCHEME)
    .refine((value) => value === '' || HAS_TEMPLATE.test(value) || URL.canParse(value));

const SCHEMES: Record<ConnectionTransport, RegExp> = {
    socketio: /^https?:\/\//,
    websocket: /^wss?:\/\//,
};

/**
 * Whether the url speaks the scheme the transport dials. One whose scheme a variable carries
 * speaks whatever the variable resolves to, and the dial holds that against the transport.
 */
export function urlMatchesTransport(transport: ConnectionTransport, url: string): boolean {
    return SCHEME_FROM_VARIABLE.test(url) || SCHEMES[transport].test(url);
}
