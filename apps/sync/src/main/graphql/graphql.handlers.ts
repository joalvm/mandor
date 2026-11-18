import { INTROSPECTION_QUERY } from '@mandor/graphql';
import { activeRepo, type HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    failure,
    graphqlSchemaReadRequestSchema,
    success,
    type Channel,
    type GraphqlIntrospectRequest,
    type Result,
} from '@mandor/ipc';
import type { GraphqlSchemaCache } from '@mandor/schema';

import { dispatchItem, type DispatchContext } from '../request/dispatch-item.js';
import { failureOfSend } from '../request/failure-of-send.js';
import { resolveRequest } from '../request/resolve-request.js';
import type { SendDeps } from '../request/run-send.js';
import { introspectionOf, MAX_SCHEMA_BYTES } from './introspection-of.js';
import { readSchemaCache, writeSchemaCache } from './schema-cache.js';
import { schemaKey } from './schema-key.js';

const CHANNEL_LIST: Channel[] = [CHANNELS.graphqlSchemaRead, CHANNELS.graphqlIntrospect];

type Work<T> = (
    context: DispatchContext,
    input: GraphqlIntrospectRequest,
    signal: AbortSignal,
) => Promise<Result<T>>;

/** The variables of a body are not part of the question, and an undefined one must not refuse it. */
function withoutBody(input: GraphqlIntrospectRequest): GraphqlIntrospectRequest {
    return { ...input, request: { ...input.request, body: { type: 'none' } } };
}

async function keyOf(
    context: DispatchContext,
    input: GraphqlIntrospectRequest,
): Promise<Result<string>> {
    const resolved = await resolveRequest(context.place, withoutBody(input), {
        auth: 'skip',
        networkFor: context.networkFor,
    });

    return resolved.ok ? success(schemaKey(resolved.value.url, input.environmentId)) : resolved;
}

const readSchema: Work<GraphqlSchemaCache | null> = async (context, input) => {
    const key = await keyOf(context, input);

    // A request that cannot be resolved has no server yet, so nothing is kept for it.
    return key.ok
        ? success(await readSchemaCache(context.place.root, input.workspaceId, key.value))
        : success(null);
};

const introspect: Work<GraphqlSchemaCache> = async (context, input, signal) => {
    const key = await keyOf(context, input);

    if (!key.ok) {
        return key;
    }

    const dispatched = await dispatchItem(
        context,
        withoutBody(input),
        {
            method: 'POST',
            body: { type: 'graphql', query: INTROSPECTION_QUERY, variables: '' },
            // Nothing names a schema spilled to disk, so nothing would remove it: past the most
            // main reads, the question dies instead, and no byte of it is kept.
            spillThresholdBytes: MAX_SCHEMA_BYTES + 1,
            maxResponseBytes: MAX_SCHEMA_BYTES,
        },
        signal,
    );

    if (!dispatched.ok) {
        return dispatched;
    }

    const found = introspectionOf(dispatched.value.response);

    if (!found.ok) {
        return failure('graphql-introspection', found.message);
    }

    const cache = { fetchedAt: new Date().toISOString(), introspection: found.introspection };

    await writeSchemaCache(context.place.root, input.workspaceId, key.value, cache);

    return success(cache);
};

/**
 * The two channels of the schema of a server: read the one kept, and ask the server for it again.
 * The question travels the way a send does, so it is let in by the same rules, and it is not a
 * send: it is never written to the history. The disposer cuts what is still in flight.
 */
export function registerGraphqlHandlers(ipc: HandlerIpc, deps: SendDeps): () => void {
    const inflight = new Set<AbortController>();

    function handle<T>(channel: Channel, work: Work<T>): void {
        ipc.handle(channel, async (_event, raw): Promise<Result<T>> => {
            const input = graphqlSchemaReadRequestSchema.safeParse(raw);
            const repo = activeRepo();

            if (!input.success) {
                return failure('bad-request', input.error.message);
            }

            if (!repo.ok) {
                return repo;
            }

            const controller = new AbortController();
            const place = {
                root: repo.value.root,
                repo: repo.value.id,
                readSecret: deps.readSecret,
            };
            const context = { place, networkFor: deps.networkFor };

            inflight.add(controller);

            try {
                return await work(context, input.data, controller.signal);
            } catch (error) {
                return failureOfSend(error);
            } finally {
                inflight.delete(controller);
            }
        });
    }

    handle(CHANNELS.graphqlSchemaRead, readSchema);
    handle(CHANNELS.graphqlIntrospect, introspect);

    return () => {
        for (const controller of inflight) {
            controller.abort();
        }

        inflight.clear();
        CHANNEL_LIST.forEach((channel) => {
            ipc.removeHandler(channel);
        });
    };
}
