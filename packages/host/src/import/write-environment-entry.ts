import type { ImportPlanEntry } from '@mandor/interop-core';
import { variableSchema, type Environment, type ItemOrigin, type Variable } from '@mandor/schema';
import { readEnvironment, writeEnvironment } from '@mandor/store-fs';

/**
 * Writes one environment of the document. A new one takes what the document gives it. One that
 * an earlier import wrote keeps every value the person has filled in since: the name follows the
 * document and a variable the document added comes in with its default, but no value is touched
 * and no variable is dropped — an environment is where the user keeps what the document cannot
 * know.
 */
export async function writeEnvironmentEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
): Promise<void> {
    const origin = entry.resource?.origin ?? identity ?? undefined;
    const fields = entry.resource?.fields ?? {};
    const name = typeof fields['name'] === 'string' ? fields['name'] : entry.name;
    const listed = fields['variables'];
    const incoming = Array.isArray(listed) ? variableSchema.array().parse(listed) : [];

    if (entry.class !== 'update') {
        await writeEnvironment(root, workspaceId, {
            id: entry.route,
            name,
            variables: incoming,
            origin,
        });

        return;
    }

    const current = await readEnvironment(root, workspaceId, entry.route);

    await writeEnvironment(root, workspaceId, {
        ...current,
        name,
        variables: mergedVariables(current, incoming),
        origin,
    });
}

/** The values already there win; only names the environment does not have yet are appended. */
function mergedVariables(current: Environment, incoming: readonly Variable[]): Variable[] {
    const known = new Set(current.variables.map((variable) => variable.name));

    return [...current.variables, ...incoming.filter((variable) => !known.has(variable.name))];
}
