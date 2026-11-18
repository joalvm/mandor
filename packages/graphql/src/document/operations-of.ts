import { parse, type DefinitionNode, type OperationTypeNode } from 'graphql';

import { errorMessage } from '../error-message.js';

/** One operation of a document: its name (null when anonymous) and what it does. */
export type GraphqlOperation = { name: string | null; kind: OperationTypeNode };

export type OperationsResult =
    | { ok: true; operations: GraphqlOperation[]; fragments: string[] }
    | { ok: false; message: string };

function operationOf(definition: DefinitionNode): GraphqlOperation[] {
    if (definition.kind !== 'OperationDefinition') {
        return [];
    }

    return [{ name: definition.name?.value ?? null, kind: definition.operation }];
}

function fragmentOf(definition: DefinitionNode): string[] {
    if (definition.kind !== 'FragmentDefinition') {
        return [];
    }

    return [definition.name.value];
}

/**
 * The operations and fragments a document defines. A syntax error is an answer, not an
 * exception: the editor keeps working while the query is half written.
 */
export function operationsOf(query: string): OperationsResult {
    try {
        const { definitions } = parse(query);

        return {
            ok: true,
            operations: definitions.flatMap(operationOf),
            fragments: definitions.flatMap(fragmentOf),
        };
    } catch (error) {
        return { ok: false, message: errorMessage(error) };
    }
}
