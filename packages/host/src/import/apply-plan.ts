import type {
    AppliedResource,
    ImportPlan,
    ImportPlanEntry,
    ImportPlanEntryClass,
    ResourcePlace,
} from '@mandor/interop-core';

import { FolderImportTakenError } from './folder-import-taken-error.js';
import { removeEntry, writeEntry } from './write-entry.js';

/** What runs before an entry is written, so a value it holds is safe before its file changes. */
export type KeepSecretsOf = (entry: ImportPlanEntry) => Promise<void>;

type Applying = {
    root: string;
    workspaceId: string;
    identity: ImportPlan['identity'];
    keep: KeepSecretsOf;
};

function keepNothing(): Promise<void> {
    return Promise.resolve();
}

/**
 * Writes what the user accepted, in an order that cannot orphan anything: the workspace and its
 * environments first, then folders, the items inside them, the connections, the notes, and the
 * removals last of all. A conflict writes nothing and says so. A write or removal that fails answers
 * with its reason and the rest still go. Everything answers as an `AppliedResource`, and the
 * ones that are `ok` are the count the import reports.
 */
export async function applyPlan(
    root: string,
    workspaceId: string,
    plan: ImportPlan,
    keep: KeepSecretsOf = keepNothing,
): Promise<AppliedResource[]> {
    const applying: Applying = { root, workspaceId, identity: plan.identity, keep };
    const applied: AppliedResource[] = [];

    for (const entry of ordered(plan)) {
        applied.push(await applyEntry(applying, entry));
    }

    return applied;
}

/**
 * What the rest points at goes first — the workspace file, then environments — then the
 * collection, then its folders and items as the plan lists them, parents first and each level
 * in the arrangement it came in, then connections; removals run last, on what is left.
 */
function ordered(plan: ImportPlan): ImportPlanEntry[] {
    return [...plan.entries].toSorted(
        (left, right) => TURN[left.class](left) - TURN[right.class](right),
    );
}

/** The turn of each place. */
const ORDER: Record<ResourcePlace, number> = {
    workspace: 0,
    globals: 0,
    environment: 1,
    collection: 2,
    folder: 3,
    item: 3,
    connection: 4,
    doc: 5,
};

function turnOfPlace(entry: ImportPlanEntry): number {
    return ORDER[entry.place];
}

/** Every removal goes after all the places, in the order the plan lists them. */
const TURN: Record<ImportPlanEntryClass, (entry: ImportPlanEntry) => number> = {
    add: turnOfPlace,
    update: turnOfPlace,
    conflict: turnOfPlace,
    removal: () => 6,
};

async function applyEntry(applying: Applying, entry: ImportPlanEntry): Promise<AppliedResource> {
    // The tick decides before the class does: a removal starts unticked, and one nobody marked
    // must not delete a file the user kept.
    if (!entry.selected) {
        return { place: entry.place, route: entry.route, ok: false, reason: 'excluded' };
    }

    if (entry.class !== 'removal' && entry.resource === null) {
        return { place: entry.place, route: entry.route, ok: false, reason: 'conflict' };
    }

    // A failure answers for its own entry: thrown, it would leave the entries already written
    // on disk with no commit.
    try {
        await carryOut(applying, entry);

        return { place: entry.place, route: entry.route, ok: true };
    } catch (error) {
        return { place: entry.place, route: entry.route, ok: false, reason: reasonOf(error) };
    }
}

/** A removal deletes what the document no longer carries; anything else is written. */
async function carryOut(applying: Applying, entry: ImportPlanEntry): Promise<void> {
    const { root, workspaceId, identity, keep } = applying;

    if (entry.class === 'removal') {
        await removeEntry(root, workspaceId, entry);

        return;
    }

    await keep(entry);
    await writeEntry(root, workspaceId, entry, identity);
}

/** A folder an import may not touch has a code of its own; any other failure says what it said. */
function reasonOf(error: unknown): string {
    return error instanceof FolderImportTakenError ? 'folder-taken' : String(error);
}
