import type { ImportPlanEntry } from '@mandor/interop-core';
import {
    authConfigSchema,
    plainVariableSchema,
    requestLineSchema,
    requestScriptsSchema,
    type FolderSettings,
    type ItemOrigin,
} from '@mandor/schema';
import { z } from 'zod';

import { ownAuthOf, type OwnedSettings } from './own-collection.js';

const variablesSchema = z.array(plainVariableSchema);
const headersSchema = z.array(requestLineSchema);

/** What the entry brings for its level, each key read the way the file reads it. */
export function carriedBy(entry: ImportPlanEntry) {
    const fields = entry.resource?.fields ?? {};
    const { description } = fields;
    const rawAuth = fields['auth'];

    return {
        description: typeof description === 'string' ? description : undefined,
        variables: variablesSchema.parse(fields['variables'] ?? []),
        // `inherit` is the default of a level: it brings none.
        auth: ownAuthOf(rawAuth === undefined ? undefined : authConfigSchema.parse(rawAuth)),
        headers: headersSchema.parse(fields['headers'] ?? []),
        scripts: requestScriptsSchema.parse(fields['scripts'] ?? {}),
    };
}

function listOrNone<Item>(list: Item[]): Item[] | undefined {
    return list.length === 0 ? undefined : list;
}

/** The keys one write sets: a level that brings nothing of a key leaves none in its file. */
export function settingsPatchOf(carried: ReturnType<typeof carriedBy>) {
    return {
        description: carried.description,
        variables: listOrNone(carried.variables),
        auth: carried.auth,
        headers: listOrNone(carried.headers),
        scripts: Object.keys(carried.scripts).length === 0 ? undefined : carried.scripts,
    };
}

/** Whether a level declares anything an import could have written. */
export function holdsSettings(level: OwnedSettings): boolean {
    const lists = [level.variables, level.headers];
    const writesScripts = Object.keys(level.scripts ?? {}).length > 0;

    return (
        level.description !== undefined ||
        level.auth !== undefined ||
        writesScripts ||
        lists.some((list) => (list ?? []).length > 0)
    );
}

function isMine(file: FolderSettings, origin: ItemOrigin | undefined, hash: string): boolean {
    const written = file.importOrigin;

    return (
        origin !== undefined &&
        written?.kind === origin.kind &&
        written.sourceId === origin.sourceId &&
        written.fingerprint === hash
    );
}

/** Settings the file holds that this import did not put there, or that someone changed since. */
export function setByHand(
    file: FolderSettings,
    origin: ItemOrigin | undefined,
    hash: string,
): boolean {
    return holdsSettings(file) && !isMine(file, origin, hash);
}

/** The claim written beside what the import owns, hashed the way the next import will. */
export function claimOf(origin: ItemOrigin | undefined, hash: string): ItemOrigin | undefined {
    return origin === undefined
        ? undefined
        : { kind: origin.kind, sourceId: origin.sourceId, fingerprint: hash };
}
