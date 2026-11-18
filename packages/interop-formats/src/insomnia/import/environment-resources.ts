import {
    degradation,
    type Degradation,
    distinct,
    environmentResources,
    type ImportResource,
    isRecord,
    textOf,
} from '@mandor/interop-core';
import { variableNameSchema, type Variable } from '@mandor/schema';

import type { InsomniaDocument, InsomniaEnvironment } from '../document/insomnia-tree.js';
import { originOf } from './origin-of.js';
import { withTemplates } from './template-of.js';

type Mapping = { variables: Variable[]; degradations: Degradation[] };

/** An environment of Insomnia is free JSON; Mandor's variables are text, one name each. */
function variableOf(name: string, value: unknown): Mapping {
    if (!variableNameSchema.safeParse(name).success) {
        return {
            variables: [],
            degradations: [degradation('variableNameUnusable', { name })],
        };
    }

    if (isRecord(value) || Array.isArray(value)) {
        return {
            variables: [],
            degradations: [degradation('variableIsObject', { name })],
        };
    }

    return {
        variables: [{ name, value: textOf(value), enabled: true, secret: false }],
        degradations: [],
    };
}

/**
 * The variables of the environments of one name, one after another: the first to name a
 * variable keeps it. Insomnia has no secret flag, so a value enters as it was written.
 */
export function variablesOf(environments: readonly InsomniaEnvironment[]): Mapping {
    const mappings = environments.flatMap((environment) =>
        Object.entries(environment.data).map(([name, value]) => variableOf(name, value)),
    );
    const templated = withTemplates(mappings.flatMap((mapping) => mapping.variables));
    const seen = new Set<string>();
    const variables: Variable[] = [];

    for (const variable of templated.value) {
        if (!seen.has(variable.name)) {
            variables.push(variable);
        }

        seen.add(variable.name);
    }

    return {
        variables,
        degradations: distinct([
            ...mappings.flatMap((mapping) => mapping.degradations),
            ...templated.notes,
        ]),
    };
}

function environmentResourcesOf(documents: readonly InsomniaDocument[]): ImportResource[] {
    return environmentResources(documents, { variablesOf, originOf });
}

/**
 * The base environment of one document as Mandor keeps it: the variables of its collection, which
 * the chosen environment overrides — exactly what Insomnia does with it.
 */
export function baseVariablesOf(document: InsomniaDocument): Mapping {
    return document.base === undefined
        ? { variables: [], degradations: [] }
        : variablesOf([document.base]);
}

export function workspaceResourcesOf(documents: readonly InsomniaDocument[]): ImportResource[] {
    return environmentResourcesOf(documents);
}
