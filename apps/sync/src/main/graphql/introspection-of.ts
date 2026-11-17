import { schemaOf } from '@mandor/graphql';
import { graphqlSchemaCacheSchema, type GraphqlSchemaCache } from '@mandor/schema';
import type { SyncResponse } from '@mandor/transport-sync';

export type IntrospectionResult =
    | { ok: true; introspection: GraphqlSchemaCache['introspection'] }
    | { ok: false; message: string };

/** The most of a schema main reads into memory: past it, the server is asking for too much. */
export const MAX_SCHEMA_BYTES = 16 * 1_048_576;

type Answer = { data?: unknown; errors?: unknown };

/** The introspection as the cache keeps it: loose, so what the server sent is written back whole. */
const INTROSPECTION = graphqlSchemaCacheSchema.shape.introspection;

function messageOfErrors(errors: unknown): string | undefined {
    const first: unknown = Array.isArray(errors) ? errors[0] : undefined;

    if (typeof first !== 'object' || first === null || !('message' in first)) {
        return undefined;
    }

    return typeof first.message === 'string' ? first.message : undefined;
}

function parse(bytes: Uint8Array): Answer | undefined {
    try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    } catch {
        return undefined;
    }
}

/** Why an answer that is JSON still holds no schema: what the server said, or what is wrong. */
function reasonOf(answer: Answer, status: number, built: string): string {
    const { data } = answer;

    if (data === undefined || data === null) {
        return messageOfErrors(answer.errors) ?? `The answer has no data (HTTP ${String(status)})`;
    }

    return built;
}

/**
 * What the server answered to the introspection query, as the introspection itself or as the
 * reason there is none. A server answers errors with a 200, or with a 400 that carries the same
 * body, so the body is read before the status is blamed.
 */
export function introspectionOf(response: SyncResponse): IntrospectionResult {
    if (response.body.kind !== 'inline') {
        return { ok: false, message: 'The schema is bigger than 16 MiB' };
    }

    const answer = parse(response.body.bytes);

    if (answer === undefined) {
        return { ok: false, message: `The answer is not JSON (HTTP ${String(response.status)})` };
    }

    const built = schemaOf(answer.data);

    if (!built.ok) {
        return { ok: false, message: reasonOf(answer, response.status, built.message) };
    }

    // A schema was built from it, so it holds the `__schema` object the cache asks for.
    return { ok: true, introspection: INTROSPECTION.parse(answer.data) };
}
