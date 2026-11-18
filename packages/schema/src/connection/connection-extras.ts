import { z } from 'zod';

import { connectionFieldsSchema } from './connection-schema.js';

const { shape } = connectionFieldsSchema;

/** The parts of a connection that a document can carry besides its name, transport and address. */
const extrasSchema = z.object({
    headers: shape.headers.optional(),
    params: shape.params,
    description: shape.description,
    auth: shape.auth,
    websocket: shape.websocket,
    socketio: shape.socketio,
    retry: shape.retry,
    keepalive: shape.keepalive,
});

export type ConnectionExtras = z.infer<typeof extrasSchema>;

/**
 * What a foreign document says about a connection beyond its address: its headers, switched off
 * or not, its query, notes, auth and transport settings. A part that is not a valid
 * one is left out and the rest stays, so a document with one odd key still brings its connection.
 */
export function connectionExtrasOf(fields: Readonly<Record<string, unknown>>): ConnectionExtras {
    const parsed = extrasSchema.safeParse(fields);

    if (parsed.success) {
        return parsed.data;
    }

    const refused = new Set(parsed.error.issues.map((issue) => issue.path[0]));
    const readable = Object.entries(fields).filter(([key]) => !refused.has(key));

    return extrasSchema.parse(Object.fromEntries(readable));
}
