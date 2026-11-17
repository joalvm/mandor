import type { ItemOrigin } from '@mandor/schema';

import { environmentFingerprint } from '../resource/environment-fingerprint.js';
import type { ImportResource } from '../resource/import-resource.js';
import { slugFor } from './claim-route.js';
import { nameOr } from './resource-parts.js';
import type { VariablesMapping } from './variables-of.js';

/** The environments one collection of an import holds, and the file they came from. */
export type EnvironmentsOfSource<Environment> = {
    sourceId: string;
    environments: readonly Environment[];
};

type Group<Environment> = { sourceId: string; environments: Environment[] };

/** The environments of one name across the sources, and the first source to bring one. */
function groupedByName<Environment extends { name: string }>(
    sources: readonly EnvironmentsOfSource<Environment>[],
): Map<string, Group<Environment>> {
    const groups = new Map<string, Group<Environment>>();

    for (const source of sources) {
        for (const environment of source.environments) {
            const name = nameOr(environment.name, 'Environment');
            const group = groups.get(name) ?? { sourceId: source.sourceId, environments: [] };

            group.environments.push(environment);
            groups.set(name, group);
        }
    }

    return groups;
}

/**
 * One environment per name across the sources: the ones that share a name are one environment,
 * their variables read together. `variablesOf` and `originOf` are the format's: how it reads a
 * variable, and the origin its resources carry.
 */
export function environmentResources<Environment extends { name: string }>(
    sources: readonly EnvironmentsOfSource<Environment>[],
    reader: {
        variablesOf: (group: readonly Environment[]) => VariablesMapping;
        originOf: (sourceId: string, fingerprint: string) => ItemOrigin;
    },
): ImportResource[] {
    const taken: string[] = [];

    return [...groupedByName(sources)].map(([name, group]) => {
        const mapped = reader.variablesOf(group.environments);
        const route = slugFor(name, taken, 'environment');

        taken.push(route);

        return {
            place: 'environment',
            itemKind: null,
            route,
            name,
            fields: { name, variables: mapped.variables },
            origin: reader.originOf(
                group.sourceId,
                environmentFingerprint({ name, variables: mapped.variables }),
            ),
            degradations: mapped.degradations,
        };
    });
}
