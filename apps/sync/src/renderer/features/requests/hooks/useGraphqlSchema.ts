import { itemPartsOf } from '@mandor/collections';
import { envStore } from '@mandor/env';
import type { ErrorCode, GraphqlIntrospectRequest } from '@mandor/ipc';
import type { GraphqlSchemaCache, RequestItem } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { syncBridge } from '../../../app/sync-bridge.js';
import type { GraphqlSchemaFacts } from '../lib/graphql-schema-view.js';
import { withRequestDefaults } from '../lib/send-input.js';

/**
 * What is kept and asked of the schema of the server a request points at, still as data: the
 * editor of the query builds the schema, so the GraphQL library loads only with that editor.
 */
export type GraphqlSchemaAsk = {
    /** The same object until something is learned: the editor builds once per change. */
    facts: GraphqlSchemaFacts;
    /** Asks the server for its schema again, with the request as it is on screen. */
    refresh: () => void;
};

type Target = { environmentId: string | null; itemPath: string; workspaceId: string };

/** What was learned of the schema, with the server it was learned for. */
type PlacedFacts = GraphqlSchemaFacts & { place: string };

/** Nothing kept and nothing asked: a server that was never looked at. */
const NO_FACTS: GraphqlSchemaFacts = { cache: null, error: null, loading: false };

function inputOf(target: Target, request: RequestItem): GraphqlIntrospectRequest {
    return { ...target, request: withRequestDefaults(request) };
}

/** The schema the server answers with, or the code of why it gave none. */
function introspected(input: GraphqlIntrospectRequest): Promise<GraphqlSchemaCache | ErrorCode> {
    return syncBridge.graphql
        .introspect(input)
        .then((result) => (result.ok ? result.value : result.error.code))
        .catch((): ErrorCode => 'unknown');
}

/** A failed ask leaves the schema that was kept; a schema answered replaces it. */
function answered(
    facts: GraphqlSchemaFacts,
    answer: GraphqlSchemaCache | ErrorCode,
): GraphqlSchemaFacts {
    if (typeof answer === 'string') {
        return { ...facts, error: answer, loading: false };
    }

    return { cache: answer, error: null, loading: false };
}

/**
 * The schema kept for the server a request points at, read when it is first looked at and again
 * whenever that server changes: another url, another query, another environment. Asking the
 * server is manual, never a side effect of opening or typing. Off for a request that is not
 * GraphQL, which then reads and asks nothing. What was learned for another server is never shown.
 */
export function useGraphqlSchema(
    resource: string,
    request: RequestItem,
    enabled: boolean,
): GraphqlSchemaAsk {
    const parts = itemPartsOf(resource);
    const workspaceId = parts?.workspaceId;
    const itemPath = parts?.path;
    const environmentId = useStore(envStore, (state) =>
        workspaceId === undefined ? null : (state.activeEnvironmentIds[workspaceId] ?? null),
    );
    const [learned, setLearned] = useState<PlacedFacts | null>(null);
    /** Which ask is the current one: a later answer to an earlier one is dropped. */
    const turn = useRef(0);
    const place = JSON.stringify([
        enabled,
        environmentId,
        itemPath,
        workspaceId,
        request.url,
        request.query,
    ]);
    const facts = learned?.place === place ? learned : NO_FACTS;
    const target =
        workspaceId === undefined || itemPath === undefined
            ? null
            : { environmentId, itemPath, workspaceId };

    // The schema kept is read for the request on screen; a key typed in it is no reason to read.
    const readKept = useEffectEvent((at: Target) =>
        syncBridge.graphql.readSchema(inputOf(at, request)),
    );

    useEffect(() => {
        const mine = ++turn.current;

        if (!enabled || workspaceId === undefined || itemPath === undefined) {
            return;
        }

        fireAndForget(
            readKept({ environmentId, itemPath, workspaceId }).then((result) => {
                if (turn.current === mine && result.ok) {
                    setLearned({ ...NO_FACTS, cache: result.value, place });
                }
            }),
        );
    }, [enabled, environmentId, itemPath, place, workspaceId]);

    function refresh(): void {
        if (target === null) {
            return;
        }

        const mine = ++turn.current;

        setLearned({ ...facts, error: null, loading: true, place });
        fireAndForget(
            introspected(inputOf(target, request)).then((answer) => {
                if (turn.current === mine) {
                    setLearned((now) => ({ ...answered(now ?? NO_FACTS, answer), place }));
                }
            }),
        );
    }

    return { facts, refresh };
}
