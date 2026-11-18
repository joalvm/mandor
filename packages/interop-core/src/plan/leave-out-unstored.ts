import { isRecord } from '../ir/is-record.js';
import { collectionFingerprint } from '../resource/collection-fingerprint.js';
import { degradation, type Degradation, type DegradationCode } from '../resource/degradation.js';
import { fingerprintOf } from './fingerprint-of.js';
import type { ImportResource } from '../resource/import-resource.js';
import { storableKindOf, type StorableKind } from '../resource/storable-kind.js';
import type { WorkspaceFolderSettings } from '../workspace/workspace-data.js';
import type { ImportPlan, ImportPlanEntry } from './import-plan.js';

/** What each kind says when the app has no place for it. */
const LEFT_OUT: Record<StorableKind, DegradationCode> = {
    connection: 'leftOutConnections',
    message: 'leftOutMessages',
    request: 'leftOutRequests',
};

/** A setting a collection or a folder may declare, and that an app may keep or not. */
export type FolderSetting = keyof WorkspaceFolderSettings;

const FOLDER_SETTINGS: readonly FolderSetting[] = ['description', 'variables', 'auth', 'headers'];

/** What a folder or a collection says of a setting this app keeps no place for. */
const NOT_KEPT: Partial<
    Record<ImportResource['place'], Partial<Record<FolderSetting, DegradationCode>>>
> = {
    collection: {
        auth: 'collectionKeepsNoAuth',
        description: 'collectionKeepsNoDescription',
        headers: 'collectionKeepsNoHeaders',
        variables: 'collectionKeepsNoVariables',
    },
    folder: {
        auth: 'folderKeepsNoAuth',
        description: 'folderKeepsNoDescription',
        headers: 'folderKeepsNoHeaders',
        variables: 'folderKeepsNoVariables',
    },
};

/** How each level hashes what the import writes: the same keys its mapper hashed. */
const FINGERPRINT_OF: Partial<
    Record<ImportResource['place'], (name: string, fields: Record<string, unknown>) => string>
> = {
    collection: (name, fields) => collectionFingerprint({ ...fields, name }),
    folder: (name, fields) => fingerprintOf({ name, ...fields }),
};

/**
 * The plan with what this app keeps no place for taken out. A leaf stays in the list, unmarked and
 * with the reason, so the person reads what the document held that did not come in. A setting of a
 * collection or a folder leaves the resource, which still enters, says so and hashes only what is
 * written. What an app keeps is its own data; nobody asks which app this is. What the format itself
 * could not carry whole stays on the resource, and keeps no leaf out.
 */
export function leaveOutUnstored(
    plan: ImportPlan,
    stores: readonly StorableKind[],
    folderSettings: readonly FolderSetting[],
): ImportPlan {
    return {
        ...plan,
        entries: plan.entries.map((entry) => leftOut(settingsKept(entry, folderSettings), stores)),
    };
}

function leftOut(entry: ImportPlanEntry, stores: readonly StorableKind[]): ImportPlanEntry {
    const kind = entry.resource === null ? null : storableKindOf(entry.resource);

    if (entry.resource === null || kind === null || stores.includes(kind)) {
        return entry;
    }

    return {
        ...entry,
        selected: false,
        leftOut: degradation(LEFT_OUT[kind]),
    };
}

function settingsKept(entry: ImportPlanEntry, kept: readonly FolderSetting[]): ImportPlanEntry {
    const { resource } = entry;
    const hashOf = resource === null ? undefined : FINGERPRINT_OF[resource.place];

    if (resource === null || hashOf === undefined) {
        return entry;
    }

    const out = FOLDER_SETTINGS.filter(
        (setting) => !kept.includes(setting) && resource.fields[setting] !== undefined,
    );

    if (out.length === 0) {
        return entry;
    }

    const fields = Object.fromEntries(
        Object.entries(resource.fields).filter(([key]) => !(out as string[]).includes(key)),
    );

    return {
        ...entry,
        resource: {
            ...resource,
            fields,
            origin: { ...resource.origin, fingerprint: hashOf(resource.name, fields) },
            degradations: [...resource.degradations, ...rowsOf(resource, out)],
        },
    };
}

/** `inherit` is what a level says by default: taking it out loses nothing worth a row. */
function rowsOf(resource: ImportResource, out: readonly FolderSetting[]): Degradation[] {
    return out
        .filter((setting) => !isInherit(resource.fields[setting]))
        .flatMap((setting) => {
            const code = NOT_KEPT[resource.place]?.[setting];

            return code === undefined ? [] : [degradation(code)];
        });
}

function isInherit(value: unknown): boolean {
    return isRecord(value) && 'inherit' in value;
}
