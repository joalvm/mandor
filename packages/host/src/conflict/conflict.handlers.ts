import {
    CHANNELS,
    conflictKeepMineRequestSchema,
    conflictReadRequestSchema,
    conflictResolveRequestSchema,
    type ConflictDetail,
    type ConflictSummary,
} from '@mandor/ipc';
import { IdError } from '@mandor/schema';
import { listConflicts, removeConflict } from '@mandor/store-fs';
import { z } from 'zod';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import { announceConflictsChanged } from '../repo/conflict-events.js';
import { clashOfRecord } from './clash-of-record.js';
import { keepMine, resolveConflict } from './resolve-conflict.js';

/** The parts of an entity that clash: the first step of the path of each question. */
function sectionsOf(paths: string[][]): string[] {
    return [...new Set(paths.flatMap(([first]) => (first === undefined ? [] : [first])))];
}

/**
 * Every clash that still has a question. A record whose questions were all answered since —
 * the file was edited by hand, or the other side took the same value — is taken away on the
 * way, and the window is told the list changed.
 */
async function listClashes(root: string): Promise<ConflictSummary[]> {
    const { conflicts } = await listConflicts(root);
    const summaries: ConflictSummary[] = [];
    let gone = false;

    for (const { id, record } of conflicts) {
        const clash = await clashOfRecord(root, record);

        if (clash === null) {
            await removeConflict(root, id);
            gone = true;
        } else {
            summaries.push({
                id,
                entity: clash.entity,
                name: clash.name,
                sections: sectionsOf(clash.conflicts.map((each) => each.path)),
                source: record.source,
                at: record.at,
            });
        }
    }

    if (gone) {
        announceConflictsChanged(root);
    }

    return summaries;
}

/** One clash with its questions. An id the repo keeps no record of is a request that is wrong. */
async function readClash(root: string, id: string): Promise<ConflictDetail> {
    const { conflicts } = await listConflicts(root);
    const kept = conflicts.find((each) => each.id === id);
    const clash = kept === undefined ? null : await clashOfRecord(root, kept.record);

    if (clash === null) {
        if (kept !== undefined) {
            await removeConflict(root, id);
            announceConflictsChanged(root);
        }

        throw new IdError(id);
    }

    return { id, ...clash };
}

/**
 * The channels a renderer uses for the clashes of the open origin: the list, one clash opened,
 * and the two ways of closing one. The texts are worked out from the disk on each call, so the
 * window never reads a copy that went stale.
 */
export function registerConflictHandlers(ipc: HandlerIpc): () => void {
    const list = rootedHandler(z.object({}).strict(), (root) => listClashes(root));
    const read = rootedHandler(conflictReadRequestSchema, (root, { id }) => readClash(root, id));

    const resolve = rootedHandler(conflictResolveRequestSchema, async (root, { id, choices }) => {
        await resolveConflict(root, id, choices);

        return {};
    });
    const mine = rootedHandler(conflictKeepMineRequestSchema, async (root, { id }) => {
        await keepMine(root, id);

        return {};
    });

    ipc.handle(CHANNELS.conflictList, (_event, raw) => list(raw ?? {}));
    ipc.handle(CHANNELS.conflictRead, (_event, raw) => read(raw));
    ipc.handle(CHANNELS.conflictResolve, (_event, raw) => resolve(raw));
    ipc.handle(CHANNELS.conflictKeepMine, (_event, raw) => mine(raw));

    return () => {
        ipc.removeHandler(CHANNELS.conflictList);
        ipc.removeHandler(CHANNELS.conflictRead);
        ipc.removeHandler(CHANNELS.conflictResolve);
        ipc.removeHandler(CHANNELS.conflictKeepMine);
    };
}
