import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    graphqlIntrospectResultSchema,
    graphqlSchemaReadResultSchema,
    type GraphqlArea,
} from '@mandor/ipc';

/**
 * The schema of the server a request points at: the one kept, and the one the server gives when
 * asked. Every answer is validated at this edge; one out of contract is a bug in main, louder thrown.
 */
export function createGraphqlBridge({ call }: BridgeKit): GraphqlArea {
    return {
        readSchema: (input) =>
            call(CHANNELS.graphqlSchemaRead, graphqlSchemaReadResultSchema, input),
        introspect: (input) =>
            call(CHANNELS.graphqlIntrospect, graphqlIntrospectResultSchema, input),
    };
}
