import { degradation, type ImportPlan } from '@mandor/interop-core';
import { variableSchema, type Variable } from '@mandor/schema';
import { z } from 'zod';

const variablesSchema = z.array(variableSchema);

/**
 * Writing globals adds the names the origin lacks and keeps every value it has. The row says so of
 * a name that comes with another value, which the person would otherwise expect to see written.
 */
export function withGlobalClashes(plan: ImportPlan, globals: readonly Variable[]): ImportPlan {
    return {
        ...plan,
        entries: plan.entries.map((entry) => {
            const { resource } = entry;

            if (entry.place !== 'globals' || resource === null) {
                return entry;
            }

            const clashes = clashesOf(resource.fields['variables'], globals);

            return clashes.length === 0
                ? entry
                : {
                      ...entry,
                      resource: {
                          ...resource,
                          degradations: [
                              ...resource.degradations,
                              degradation('globalsKept', { names: clashes.join(', ') }),
                          ],
                      },
                  };
        }),
    };
}

function clashesOf(raw: unknown, globals: readonly Variable[]): string[] {
    const incoming = variablesSchema.safeParse(raw);
    const held = new Map(globals.map((variable) => [variable.name, variable]));

    if (!incoming.success) {
        return [];
    }

    return incoming.data
        .filter((variable) => {
            const current = held.get(variable.name);

            return current !== undefined && current.value !== variable.value && !variable.secret;
        })
        .map((variable) => variable.name);
}
