import {
    FormatInputError,
    importPlan,
    type InteropFormat,
    leaveOutUnstored,
    resourcesInScope,
    type FolderSetting,
    type StorableKind,
} from '@mandor/interop-core';
import {
    failure,
    importPlanBuildRequestSchema,
    type Err,
    type ImportPlanBuildRequest,
    type ImportPlanBuilt,
    type Result,
} from '@mandor/ipc';
import { newId } from '@mandor/schema';
import { readGlobals } from '@mandor/store-fs';
import { z } from 'zod';

import { checkedRequest } from '../ipc/checked-request.js';
import { failureOf } from '../ipc/failure-of.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import { formatOfFiles } from './format-of-files.js';
import { withGlobalClashes } from './global-clashes.js';
import { holdSecrets, type HeldSecrets } from './held-secrets.js';
import { existingResourcesOf } from './import-existing.js';
import type { ReadImport } from './read-import.js';

/** What this app has a place for: an import leaves the rest out, and says so. */
type AppKeeps = {
    stores: readonly StorableKind[];
    folderSettings: readonly FolderSetting[];
};

type PlanSources = { read: ReadImport; held: HeldSecrets };

/**
 * The handler that builds the whole difference of an import without touching disk. The request
 * names no format: the files are shown to the ones the app lists, and the first that recognizes
 * them reads them, through `read`: in the app, in a worker of its own, so a document built to
 * hang its parser never stops main. The parser loads then, never at startup. What the document holds
 * that the app keeps no place for stays in the plan, unmarked and with its reason. The plan crosses
 * to the window, so the values of the secrets stay behind in `held`.
 */
export function planBuilder(
    formats: readonly InteropFormat[],
    keeps: AppKeeps,
    read: ReadImport,
    held: HeldSecrets = new Map(),
): (raw: unknown) => Promise<Result<ImportPlanBuilt>> {
    return async (raw) => {
        const request = checkedRequest(importPlanBuildRequestSchema, raw);

        if (!request.ok) {
            return request;
        }

        const format = formatOfFiles(formats, request.value.files);

        if (!format.ok) {
            return format;
        }

        return rootedHandler(
            z.unknown(),
            (root) => planOf(root, format.value, request.value, { ...keeps, read, held }),
            refusalOf,
        )(null);
    };
}

async function planOf(
    root: string,
    format: InteropFormat,
    { files, scope, workspaceId }: ImportPlanBuildRequest,
    { stores, folderSettings, read: readFiles, held }: AppKeeps & PlanSources,
): Promise<ImportPlanBuilt> {
    const read = await readFiles(format, files, scope);
    const existing = workspaceId === undefined ? [] : await existingResourcesOf(root, workspaceId);

    // The scope cuts both sides of the diff: what the document brings beyond it is not written,
    // and what the workspace holds beyond it is not a removal.
    return {
        name: read.name,
        plan: withGlobalClashes(
            leaveOutUnstored(
                importPlan(
                    resourcesInScope(holdSecrets(read.resources, held), scope),
                    resourcesInScope(existing, scope),
                    newId,
                ),
                stores,
                folderSettings,
            ),
            (await readGlobals(root)).variables,
        ),
    };
}

/**
 * A document the format refused to read is a bad request, and the log gets every problem it
 * found, not only the first. Each format names its refusal after `FormatInputError`, so one
 * class of the contract tells them all without the host naming a format.
 */
function refusalOf(error: unknown): Err {
    if (error instanceof FormatInputError) {
        return failure('bad-request', error.problems.join(' | '));
    }

    return failureOf(error);
}
