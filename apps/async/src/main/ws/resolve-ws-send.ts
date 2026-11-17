import { environmentScope, type EnvironmentPlace, variableScopeOf } from '@mandor/host';
import type { WsSendRequest } from '@mandor/ipc';
import { applyFrameTemplate, itemParentOf, parseFrameTemplate } from '@mandor/schema';
import { compileSchema, loadSchemaChecker, validateValue } from '@mandor/validate';
import { resolveText, type VariableScope } from '@mandor/vars';

import type { SecretsOff } from './resolve-ws-open.js';
import type { SocketSendRequest } from './socket-manager.js';

/** What a frame takes of the socket it rides: the environment it opened with, and its secrets. */
export type SentThrough = { environmentId: string | null; secretsOff: SecretsOff };

/** A socket that lives with its secrets off resolves every frame with them off. */
type Resolve = (text: string) => string;

/**
 * The frame the port puts on the wire, built here and only here. The renderer hands over the
 * template and where it belongs, never resolved text: a value of the environment is a string
 * in this process and in no other, which is what keeps a secret out of the window.
 *
 * A name nobody defined stays as `{{name}}` in the frame. The interface warned about it before
 * asking for this, and sending something incomplete on purpose is a legitimate test.
 *
 * A socket a script pointed elsewhere, or a Socket.IO a script shaped that may poll, lives with
 * its secrets off: every frame of it, the envelope too, leaves `{{name}}` literal.
 */
export async function resolveWsSend(
    place: EnvironmentPlace,
    input: WsSendRequest,
    socket: SentThrough,
): Promise<SocketSendRequest> {
    const scope = await environmentScope(
        place,
        input.workspaceId,
        socket.environmentId,
        itemParentOf(input.itemPath),
    );
    const resolve = resolverOf(variableScopeOf(scope), socket.secretsOff);
    const message = resolve(input.template);

    // The mark of the frame is the checker's answer, so the frame waits for it the first time.
    await loadSchemaChecker();

    return {
        connectionId: input.connectionId,
        data: frameOf(input, message, resolve),
        origin: input.origin ?? undefined,
        event: input.event,
        expectAck: input.expectAck,
        ...(schemaUnmetOf(input.schema, message) ? { schemaUnmet: true } : {}),
    };
}

function resolverOf(scope: VariableScope, secretsOff: SecretsOff): Resolve {
    const options = secretsOff === null ? {} : ({ secrets: 'off' } as const);

    return (text) => resolveText(text, scope, options).text;
}

/**
 * The frame as it leaves, wrapped when the connection says so. The variables of the template
 * resolve against the same scope the message did — that is how two connections to backends
 * that differ in one value share the shape — and the schema above checked the message, never
 * the envelope: what the user wrote is what the mark of the timeline answers for.
 */
function frameOf(input: WsSendRequest, message: string, resolve: Resolve): string {
    if (input.frame === undefined || input.frame.trim() === '') {
        return message;
    }

    // The event a frame is named with: the event of the transport, or the collection item.
    const event = input.event ?? input.origin ?? null;
    const parsed = parseFrameTemplate(resolve(input.frame));

    if (!parsed.ok) {
        throw new Error(parsed.reason);
    }

    if (parsed.parts.some((part) => part.kind === 'event') && event === null) {
        throw new Error('the frame names an event, and the emission has no name');
    }

    if (parsed.parts.some((part) => part.kind === 'payload')) {
        asJson(message, 'the frame wraps the payload, and the payload is not valid JSON');
    }

    const wrapped = applyFrameTemplate(parsed.parts, {
        event: event ?? '',
        payload: message,
    });

    asJson(wrapped, 'the wrapped frame is not valid JSON');

    return wrapped;
}

/** Reads the text as JSON or refuses the send, carrying the complaint of the reader. */
function asJson(text: string, complaint: string): unknown {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${complaint}: ${String(error)}`, { cause: error });
    }
}

/**
 * Whether the frame as it truly leaves —every value resolved, secrets included— breaks the
 * schema its item promised. A body that cannot be read as JSON, and a schema that cannot be
 * read as one, mark nothing: the renderer already said its part while the payload was typed.
 */
function schemaUnmetOf(schema: string | undefined, text: string): boolean {
    if (schema === undefined || schema.trim() === '') {
        return false;
    }

    let value: unknown;

    try {
        value = JSON.parse(text);
    } catch {
        return false;
    }

    const compiled = compileSchema(schema);

    if (!compiled.ok) {
        return false;
    }

    return validateValue(compiled.schema, value).length > 0;
}
