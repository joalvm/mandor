import { schemaOf } from '@mandor/graphql';
import type { ErrorCode } from '@mandor/ipc';
import type { GraphqlSchemaCache } from '@mandor/schema';
import type { GraphQLSchema } from 'graphql';

/** `none`: nothing kept. `loading`: the server is being asked. `failed`: the last ask gave none. */
export type GraphqlSchemaState = 'failed' | 'loading' | 'none' | 'ready';

/** What a schema kept and an ask in flight come to, before they are given to the editor. */
export type GraphqlSchemaFacts = {
    cache: GraphqlSchemaCache | null;
    error: ErrorCode | null;
    loading: boolean;
};

/** What the editor is told of the schema: built, with the state it is in. */
export type GraphqlSchemaView = {
    error: ErrorCode | null;
    fetchedAt: string | null;
    /** Kept while a later ask fails: an old schema still suggests better than none. */
    schema: GraphQLSchema | null;
    state: GraphqlSchemaState;
};

function stateOf(facts: GraphqlSchemaFacts, failed: boolean, ready: boolean): GraphqlSchemaState {
    if (facts.loading) {
        return 'loading';
    }

    if (failed) {
        return 'failed';
    }

    return ready ? 'ready' : 'none';
}

/**
 * What the editor is told of the schema. A kept schema the app cannot build is a failure of its
 * own, and a failed ask leaves the schema that was kept where it was: an old schema still
 * suggests better than none.
 */
export function graphqlSchemaViewOf(facts: GraphqlSchemaFacts): GraphqlSchemaView {
    const built = facts.cache === null ? null : schemaOf(facts.cache.introspection);
    const schema = built?.ok === true ? built.schema : null;
    const unbuilt: ErrorCode | null = built?.ok === false ? 'graphql-introspection' : null;
    const error = facts.error ?? unbuilt;

    return {
        error,
        fetchedAt: facts.cache?.fetchedAt ?? null,
        schema,
        state: stateOf(facts, error !== null, schema !== null),
    };
}
