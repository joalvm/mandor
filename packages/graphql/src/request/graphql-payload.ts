import { parse as parseJsonc, type ParseError } from 'jsonc-parser';

import { operationsOf, type GraphqlOperation } from '../document/operations-of.js';
import { isRecord } from '../is-record.js';
import { GraphqlPayloadError } from './graphql-payload-error.js';

export type GraphqlPayloadInput = {
    query: string;
    /** Resolved text of the variables; blank means none. Comments and trailing commas allowed. */
    variables: string;
    operationName?: string | undefined;
};

/** The operation that will run: the chosen one, or the only one the document has. */
function chosenOf(
    operations: readonly GraphqlOperation[],
    name: string,
): GraphqlOperation | undefined {
    if (name !== '') {
        return operations.find((operation) => operation.name === name);
    }

    return operations.length === 1 ? operations[0] : undefined;
}

function variablesOf(text: string): Record<string, unknown> | undefined {
    const errors: ParseError[] = [];
    const value: unknown = parseJsonc(text, errors, { allowTrailingComma: true });

    if (text.trim() === '') {
        return undefined;
    }

    if (errors.length > 0 || !isRecord(value)) {
        throw new GraphqlPayloadError('variables', 'The variables are not a JSON object');
    }

    return value;
}

/**
 * The JSON a GraphQL server takes over HTTP. Throws a `GraphqlPayloadError` for what must not
 * leave the machine: a query that does not parse, a subscription (Async's work, not Sync's) or
 * variables that are not an object.
 */
export function graphqlPayload(input: GraphqlPayloadInput): string {
    const { query, variables } = input;
    const operationName = input.operationName ?? '';
    const parsed = operationsOf(query);

    if (!parsed.ok) {
        throw new GraphqlPayloadError('syntax', parsed.message);
    }

    if (chosenOf(parsed.operations, operationName)?.kind === 'subscription') {
        throw new GraphqlPayloadError('subscription', 'Subscriptions are not sent from Sync');
    }

    return JSON.stringify({
        query,
        variables: variablesOf(variables),
        operationName: operationName === '' ? undefined : operationName,
    });
}
