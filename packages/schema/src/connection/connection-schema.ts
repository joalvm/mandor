import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { itemOriginSchema } from '../collection/item-origin-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { connectionScriptsSchema } from '../script/own-scripts-schema.js';
import { requestLineSchema } from '../request/request-item-schema.js';
import type { Connection } from './connection.js';
import { CONNECTION_TRANSPORTS, DEFAULT_CONNECTION_TRANSPORT } from './connection-transport.js';
import { connectionUrlSchema, urlMatchesTransport } from './connection-url-schema.js';
import { handshakeOptionsSchema } from './handshake-options.js';
import { keepaliveOptionsSchema } from './keepalive-options.js';
import { retryOptionsSchema } from './retry-options.js';
import { socketIoOptionsSchema } from './socketio-options.js';
import { websocketOptionsSchema } from './websocket-options.js';
import { withHeaderLines } from './with-header-lines.js';

/** The fields of a connection as this version writes them, for whoever takes only some. */
export const connectionFieldsSchema = z.object({
    id: slugSchema,
    name: entityNameSchema,
    // Connections written before the transport existed read as websocket: the field has a
    // default, so no file on disk ever needs migrating.
    transport: z.enum(CONNECTION_TRANSPORTS).default(DEFAULT_CONNECTION_TRANSPORT),
    url: connectionUrlSchema,
    headers: z.array(requestLineSchema),
    params: z.array(requestLineSchema).optional(),
    environmentId: slugSchema.nullable(),
    description: z.string().optional(),
    auth: authConfigSchema.optional(),
    autoConnect: z.boolean().optional(),
    websocket: websocketOptionsSchema.optional(),
    socketio: socketIoOptionsSchema.optional(),
    retry: retryOptionsSchema.optional(),
    keepalive: keepaliveOptionsSchema.optional(),
    handshake: handshakeOptionsSchema.optional(),
    origin: itemOriginSchema.optional(),
    scripts: connectionScriptsSchema.optional(),
});

// A file written before the headers were lines still reads: its records become the lines they
// stood for, so no file on disk needs migrating by hand.
export const connectionSchema = z.preprocess(
    withHeaderLines,
    connectionFieldsSchema
        // The pair is the rule the file is read by: a websocket dialls ws(s), socket.io dials
        // http(s). One transport per connection is what makes the url mean one thing.
        .superRefine((connection, context) => {
            if (!urlMatchesTransport(connection.transport, connection.url)) {
                context.addIssue({ code: 'custom', message: 'url', path: ['url'] });
            }
        }),
) satisfies z.ZodType<Connection>;
