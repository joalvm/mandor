import { folderSettingsSchema } from '@mandor/schema';

import { documentTextWith } from '../disk/document-text.js';
import { parsedDocument } from '../disk/parsed-document.js';
import type { FolderSettingsPatch } from './write-folder-settings.js';

/** What a patch says of a key: a value, or nothing written for it. */
type Patched = FolderSettingsPatch[keyof FolderSettingsPatch] | null;

/**
 * A patch as the file takes it: an empty value — `null`, an empty text, an empty list — takes the
 * key out, since the file keeps no empties and the window cannot tell «absent» from «undefined»
 * across the bridge. A key the patch does not name stays out of it, so nothing touches it.
 */
export function absentWhenEmpty(patch: Readonly<Record<string, Patched>>): FolderSettingsPatch {
    return Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [key, isEmpty(value) ? undefined : value]),
    );
}

/**
 * The text of a `collection.yaml` or `folder.yaml` with the keys of `patch` in it, and nothing
 * else changed: comments, key order and the keys this build does not know survive. Pure, text in
 * and text out, so a guarded write can apply it over the base the window held. Each value is
 * checked against the shape of the settings before it goes in.
 */
export function patchFolderSettings(text: string, patch: FolderSettingsPatch): string {
    const changes = absentWhenEmpty(patch);
    const valid = folderSettingsSchema.partial().parse(changes);
    const named = Object.fromEntries(
        Object.keys(changes).map((key) => [key, valid[key as keyof typeof valid]]),
    );

    return documentTextWith(parsedDocument(text), named);
}

function isEmpty(value: unknown): boolean {
    return value === null || value === '' || (Array.isArray(value) && value.length === 0);
}
