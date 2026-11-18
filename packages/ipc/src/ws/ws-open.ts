import {
    authConfigSchema,
    connectionScriptsSchema,
    connectionTransportSchema,
    connectionUrlSchema,
    socketIoOptionsSchema,
    slugSchema,
    urlMatchesTransport,
} from '@mandor/schema';
import { z } from 'zod';

// The url travels as the template the file stores, `{{vars}}` included: what it resolves to is
// checked once the environment has filled it in, right before the socket dials. The scheme the
// template speaks is checked here as a pair with the transport — a websocket dials ws(s),
// Socket.IO dials http(s) — because the renderer is the part of Mandor a stranger can reach.
// The rest of what the connection dials with — the socketio group, subprotocols, frame ceiling,
// certificate, handshake wait, retry, keepalive — is configuration, not data, so it travels resolved and is
// only checked here.
export const wsOpenRequestSchema = z
    .object({
        connectionId: slugSchema,
        workspaceId: slugSchema,
        environmentId: slugSchema.nullable(),
        transport: connectionTransportSchema,
        template: z.object({
            url: connectionUrlSchema,
            headers: z.record(z.string(), z.string()).optional(),
            params: z
                .array(z.object({ key: z.string(), value: z.string(), enabled: z.boolean() }))
                .optional(),
            auth: authConfigSchema.optional(),
        }),
        socketio: socketIoOptionsSchema.optional(),
        // The scripts of the connection as the tab holds them: main runs `onBeforeConnect` before
        // it dials, and keeps them for the life of the socket. Whether each may run is main's call.
        scripts: connectionScriptsSchema.optional(),
        // The person asked to connect without running them: what scripts set before still counts.
        skipScripts: z.boolean().optional(),
        subprotocols: z.array(z.string().min(1)).max(8).optional(),
        maximumMessageSizeBytes: z.number().int().positive().max(268_435_456).optional(),
        verifyCertificate: z.boolean().optional(),
        handshakeTimeoutMs: z.number().int().min(1).max(600_000).optional(),
        reconnect: z
            .object({
                baseMs: z.number().int().min(0),
                ceilingMs: z.number().int().min(0),
                maxAttempts: z.number().int().min(0).max(100),
                spread: z.number().min(0).max(1).optional(),
            })
            .strict()
            .optional(),
        keepalive: z
            .object({
                intervalMs: z.number().int().min(1),
                pongTimeoutMs: z.number().int().min(1),
            })
            .strict()
            .optional(),
    })
    .strict()
    .superRefine((request, context) => {
        if (!urlMatchesTransport(request.transport, request.template.url)) {
            context.addIssue({ code: 'custom', message: 'url', path: ['template', 'url'] });
        }

        const auth = request.template.auth;

        if (
            auth !== undefined &&
            'type' in auth &&
            auth.type === 'apikey' &&
            auth.in === 'cookie'
        ) {
            context.addIssue({
                code: 'custom',
                message: 'a cookie does not apply to the handshake',
                path: ['template', 'auth'],
            });
        }
    });

export type WsOpenRequest = z.infer<typeof wsOpenRequestSchema>;
