import type { ImportPlanEntry, ResourcePlace } from '@mandor/interop-core';
import type { Variable } from '@mandor/schema';
import { readEnvironment, readGlobals } from '@mandor/store-fs';
import { globalsSecretKey } from '@mandor/vars';

import { environmentSecretKey } from '../secret/environment-secret-key.js';
import { keepSecretsAt } from '../secret/keep-environment-secrets.js';
import { heldOf, type HeldSecrets } from './held-secrets.js';

export type ImportedSecretsPlace = {
    userDataDir: string;
    root: string;
    repo: string;
    workspaceId: string;
};

/** Where the values of one entry go, and the variables that place already has. */
type Spot = { keyOf: (name: string) => string; known: readonly Variable[] };

type SpotOf = (place: ImportedSecretsPlace, entry: ImportPlanEntry) => Promise<Spot>;

/** Only an update finds an environment there: anything else writes a new one. */
async function variablesThere(
    place: ImportedSecretsPlace,
    entry: ImportPlanEntry,
): Promise<readonly Variable[]> {
    if (entry.class !== 'update') {
        return [];
    }

    return (await readEnvironment(place.root, place.workspaceId, entry.route)).variables;
}

async function environmentSpot(place: ImportedSecretsPlace, entry: ImportPlanEntry): Promise<Spot> {
    const { repo, workspaceId } = place;

    return {
        keyOf: (name) =>
            environmentSecretKey({ repo, workspaceId, environmentId: entry.route }, name),
        known: await variablesThere(place, entry),
    };
}

async function globalsSpot(place: ImportedSecretsPlace): Promise<Spot> {
    return {
        keyOf: (name) => globalsSecretKey(place.repo, name),
        known: (await readGlobals(place.root)).variables,
    };
}

/** The two places a secret keeps its mark: anywhere else it entered blank. */
const SPOTS: Partial<Record<ResourcePlace, SpotOf>> = {
    environment: environmentSpot,
    globals: globalsSpot,
};

/**
 * What runs before an entry is written: the values it holds go to the store of the system, and the
 * file comes after, without them. A name the place already has keeps what it has, as its writer
 * keeps it, so an import never replaces a value the person filled in.
 */
export function importedSecretsKeeper(
    held: HeldSecrets,
    place: ImportedSecretsPlace,
): (entry: ImportPlanEntry) => Promise<void> {
    return async (entry) => {
        const secrets = entry.resource === null ? [] : heldOf(held, entry.resource);
        const spotOf = SPOTS[entry.place];

        if (secrets.length === 0 || spotOf === undefined) {
            return;
        }

        const { keyOf, known } = await spotOf(place, entry);
        const names = new Set(known.map((variable) => variable.name));
        const keep = keepSecretsAt({ userDataDir: place.userDataDir, root: place.root, keyOf });

        await keep(secrets.filter((secret) => !names.has(secret.name)));
    };
}
