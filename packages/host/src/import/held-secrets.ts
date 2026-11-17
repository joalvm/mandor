import type { ImportResource } from '@mandor/interop-core';
import { variableSchema, type Variable } from '@mandor/schema';
import type { KeptSecret } from '@mandor/store-fs';
import { z } from 'zod';

const variablesSchema = z.array(variableSchema);

/**
 * The values of the secret variables of the plan on screen. The plan crosses to the window and
 * comes back when it is applied; these stay in main for that long, so the window never holds one.
 */
export type HeldSecrets = Map<string, readonly KeptSecret[]>;

type Located = Pick<ImportResource, 'place' | 'route'>;

function keyOf(resource: Located): string {
    return `${resource.place}:${resource.route}`;
}

/** The resources of a new plan without the values of their secrets, which are held instead. */
export function holdSecrets(
    resources: readonly ImportResource[],
    held: HeldSecrets,
): ImportResource[] {
    held.clear();

    return resources.map((resource) => withoutSecretValues(resource, held));
}

function withoutSecretValues(resource: ImportResource, held: HeldSecrets): ImportResource {
    const variables = variablesSchema.safeParse(resource.fields['variables']);

    if (!variables.success) {
        return resource;
    }

    const secrets = variables.data.filter((variable) => variable.secret && variable.value !== '');

    if (secrets.length === 0) {
        return resource;
    }

    held.set(
        keyOf(resource),
        secrets.map(({ name, value }) => ({ name, value })),
    );

    return {
        ...resource,
        fields: { ...resource.fields, variables: variables.data.map(blankedIfSecret) },
    };
}

function blankedIfSecret(variable: Variable): Variable {
    return variable.secret ? { ...variable, value: '' } : variable;
}

export function heldOf(held: HeldSecrets, resource: Located): readonly KeptSecret[] {
    return held.get(keyOf(resource)) ?? [];
}
