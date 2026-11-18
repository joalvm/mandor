import { buildClientSchema, type GraphQLSchema, type IntrospectionQuery } from 'graphql';

import { errorMessage } from '../error-message.js';

export type SchemaResult = { ok: true; schema: GraphQLSchema } | { ok: false; message: string };

function isIntrospection(value: unknown): value is IntrospectionQuery {
    return typeof value === 'object' && value !== null && '__schema' in value;
}

/**
 * The schema a server published, built from its answer to the introspection query. What the
 * server sends is not ours to trust, so a malformed answer is a message, not an exception.
 */
export function schemaOf(introspection: unknown): SchemaResult {
    if (!isIntrospection(introspection)) {
        return { ok: false, message: 'The answer has no __schema' };
    }

    try {
        return { ok: true, schema: buildClientSchema(introspection) };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}
