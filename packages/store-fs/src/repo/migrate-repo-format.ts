import {
    type Environment,
    newId,
    parseEnvironment,
    parseRepo,
    plainVariableSchema,
    REPO_FORMAT,
    slugSchema,
    spreadIntoEnvironments,
} from '@mandor/schema';
import { z } from 'zod';

import { readDocument } from '../disk/read-document.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { environmentFile } from '../environment/environment-path.js';
import { listEnvironments } from '../environment/list-environments.js';
import { writeEnvironment } from '../environment/write-environment.js';
import { workspaceFile } from '../workspace/workspace-path.js';
import { repoFile } from './repo-path.js';

/**
 * The two keys of `workspace.yaml` the migration reads, and nothing else: it outlives the
 * variables of the workspace in the schema, since a merge with an old machine can bring the key
 * back at any time.
 */
const oldWorkspaceSchema = z.object({
    variables: z.array(plainVariableSchema).optional(),
    defaultEnvironment: slugSchema.optional(),
});

type OldWorkspace = z.infer<typeof oldWorkspaceSchema>;

const BASE_NAME = 'Base';

/**
 * Whether the origin still has something to migrate: a workspace with the old `variables` key,
 * or a repo file sealed with an older format. It is asked by presence of the key and not by
 * version alone, because a merge with a machine that never migrated can bring the key back.
 */
export async function needsFormatMigration(root: string): Promise<boolean> {
    const repo = (await readOrThrow(repoFile(root), parseRepo)).value;

    if (repo.formatVersion < REPO_FORMAT) {
        return true;
    }

    const olds = await Promise.all(repo.workspaces.map((id) => oldWorkspaceOf(root, id)));

    return olds.some((old) => old?.variables !== undefined);
}

/**
 * Moves the variables of every workspace into its environments without changing any value a
 * machine resolves, and seals the repo in the current format. For each workspace with the key:
 * `Base` is born with the variables and becomes the default when there was none, every other
 * environment gets the names it did not have active, and the key is taken out. Answers the files
 * it wrote, for the commit; nothing when there was nothing to do.
 */
export async function migrateRepoFormat(root: string): Promise<string[]> {
    const read = await readOrThrow(repoFile(root), parseRepo);
    const touched: string[] = [];

    for (const workspaceId of read.value.workspaces) {
        touched.push(...(await migrateWorkspace(root, workspaceId)));
    }

    if (touched.length > 0 || read.value.formatVersion < REPO_FORMAT) {
        await writeDocument(repoFile(root), read.document, { formatVersion: REPO_FORMAT });
        touched.push(repoFile(root));
    }

    return touched;
}

async function oldWorkspaceOf(root: string, workspaceId: string): Promise<OldWorkspace | null> {
    const read = await readDocument(workspaceFile(root, workspaceId), (input) =>
        oldWorkspaceSchema.parse(input),
    );

    return read.ok ? read.value : null;
}

async function migrateWorkspace(root: string, workspaceId: string): Promise<string[]> {
    const file = workspaceFile(root, workspaceId);
    const read = await readDocument(file, (input) => oldWorkspaceSchema.parse(input));

    if (!read.ok || read.value.variables === undefined) {
        return [];
    }

    const { variables, defaultEnvironment } = read.value;
    const written =
        variables.length === 0 ? null : await spreadWorkspace(root, workspaceId, variables);

    await writeDocument(file, read.document, {
        variables: undefined,
        ...(written === null || defaultEnvironment !== undefined
            ? {}
            : { defaultEnvironment: written.base }),
    });

    return [...(written?.files ?? []), file];
}

async function spreadWorkspace(
    root: string,
    workspaceId: string,
    variables: NonNullable<OldWorkspace['variables']>,
): Promise<{ base: string; files: string[] }> {
    const { environments } = await listEnvironments(root, workspaceId);
    const base = { id: newId(), name: freeName(environments) };
    const spread = spreadIntoEnvironments(variables, environments, base);
    const changed = spread.environments.filter((each) => spread.changed.includes(each.id));

    await writeEnvironment(root, workspaceId, spread.base);

    // Not through the writer of environments: it blanks a name that was secret, and a declaration
    // switched off that comes on here takes a value that was already in a file that goes to git.
    for (const environment of changed) {
        await rewriteVariables(environmentFile(root, workspaceId, environment.id), environment);
    }

    return {
        base: base.id,
        files: [spread.base, ...changed].map((each) => environmentFile(root, workspaceId, each.id)),
    };
}

async function rewriteVariables(file: string, environment: Environment): Promise<void> {
    const read = await readOrThrow(file, parseEnvironment);

    await writeDocument(file, read.document, { variables: environment.variables });
}

/** `Base`, or `Base 2`, `Base 3`… when an environment already goes by it. */
function freeName(environments: readonly Environment[]): string {
    const taken = new Set(environments.map((each) => each.name));
    let name = BASE_NAME;

    for (let n = 2; taken.has(name); n += 1) {
        name = `${BASE_NAME} ${String(n)}`;
    }

    return name;
}
