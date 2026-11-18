import type { Environment, Variable } from '@mandor/schema';
import type { SearchEntry } from '@mandor/shell';

import { environmentResource } from './environment-resource.js';
import { GLOBALS_ROW } from './globals-row.js';

/**
 * The searchable envelope of the environments: one entry per environment and one per variable
 * name. A variable enters by name and never by value — a search that matched values would be an
 * oracle leaking secrets three letters at a time — and its result opens the environment it
 * lives in, which is where it can be edited.
 */
export function environmentEntries(
    environments: readonly Environment[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    return environments.flatMap((environment) => [
        {
            name: environment.name,
            resource: environmentResource(origin, workspaceId, environment.id),
            source: 'environment' as const,
            tags: [],
            trail: '',
        },
        ...environment.variables.map((variable) => ({
            name: variable.name,
            resource: environmentResource(origin, workspaceId, environment.id),
            source: 'variable' as const,
            tags: [],
            trail: environment.name,
        })),
    ]);
}

/**
 * The globals of the origin as the search finds them: each name, opening the dialog standing on
 * the globals of the workspace in front.
 */
export function globalsEntries(
    globals: readonly Variable[],
    origin: string,
    workspaceId: string,
    label: string,
): SearchEntry[] {
    return globals.map((variable) => ({
        name: variable.name,
        resource: environmentResource(origin, workspaceId, GLOBALS_ROW),
        source: 'variable' as const,
        tags: [],
        trail: label,
    }));
}
