import type { AsyncAPIDocumentInterface, OperationInterface } from '@asyncapi/parser';
import {
    type InteropOperation,
    type InteropPayloadSchema,
    type InteropSecurityScheme,
    isRecord,
} from '@mandor/interop-core';

import { messageOf } from './map-messages.js';
import { securityNamesOf } from './map-security.js';
import { rawNamed } from './map-servers.js';
import { operationDirection } from './operation-direction.js';
import { unknownKeys } from '../document/unknown-keys.js';

const KNOWN = [
    'operationId',
    'action',
    'message',
    'messages',
    'security',
    'channel',
    'channels',
    'bindings',
    'traits',
    'reply',
];

/**
 * Every operation, with the arrow already flipped — `operationDirection` answers for that — and
 * its first message carrying the payload schema it promised. Security reads from the raw form:
 * the model's requirement shape changes between versions, the written one does not.
 */
export function operationsOf(
    document: AsyncAPIDocumentInterface,
    raw: Record<string, unknown>,
    schemes: Record<string, InteropSecurityScheme>,
    payloadSchemas: Record<string, InteropPayloadSchema>,
): InteropOperation[] {
    return document
        .operations()
        .all()
        .map((operation, index) => {
            const rawOperation = rawOperationOf(raw, operation);
            const fallback = `operacion-${String(index + 1)}`;
            const first = operation.messages().all()[0];
            const message =
                first === undefined
                    ? undefined
                    : messageOf(
                          first,
                          rawMessageOf(rawOperation),
                          operation.id() ?? fallback,
                          payloadSchemas,
                      );

            return {
                name: operation.id() ?? fallback,
                channel: operation.channels().all()[0]?.id() ?? '',
                direction: operationDirection(operation),
                message,
                security: securityNamesOf(rawOperation?.['security'], schemes),
                extras: rawOperation === undefined ? {} : unknownKeys(rawOperation, KNOWN),
            };
        });
}

/** 3.x keeps operations at the top; 2.x hangs them off the channel under their action. */
function rawOperationOf(
    raw: Record<string, unknown>,
    operation: OperationInterface,
): Record<string, unknown> | undefined {
    const named = rawNamed(raw, 'operations', operation.id());

    if (named !== undefined) {
        return named;
    }

    const action = operation.action();
    const rawChannel = rawNamed(raw, 'channels', operation.channels().all()[0]?.id());

    if (rawChannel === undefined || (action !== 'publish' && action !== 'subscribe')) {
        return undefined;
    }

    const leaf = rawChannel[action];

    return isRecord(leaf) ? leaf : undefined;
}

function rawMessageOf(
    rawOperation: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    const direct = rawOperation?.['message'];

    if (isRecord(direct)) {
        return direct;
    }

    const listed = rawOperation?.['messages'];

    if (!Array.isArray(listed)) {
        return undefined;
    }

    const first: unknown = listed[0];

    return isRecord(first) ? first : undefined;
}
