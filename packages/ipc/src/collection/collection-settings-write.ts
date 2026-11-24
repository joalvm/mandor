import {
    authConfigSchema,
    collectionPathSchema,
    plainVariableSchema,
    requestLineSchema,
    requestScriptsSchema,
    slugSchema,
} from '@mandor/schema';
import { z } from 'zod';

/**
 * What the window edits of a collection or a folder, and nothing else: its words, its variables,
 * its auth, its headers and its scripts. Name and order have their own doors. A key the window
 * does not edit is an error of the contract, not a slip that reaches the disk. `null`, an empty
 * text or an empty list takes the key out of the file.
 */
export const folderSettingsPatchSchema = z
    .object({
        description: z.string().nullable().optional(),
        variables: z.array(plainVariableSchema).nullable().optional(),
        // `null` takes the auth out: the level inherits again.
        auth: authConfigSchema.nullable().optional(),
        headers: z.array(requestLineSchema).nullable().optional(),
        // `null` takes the scripts out of the file: an empty map is not a thing the window sends.
        scripts: requestScriptsSchema.nullable().optional(),
    })
    .strict();

export const collectionSettingsWriteRequestSchema = z
    .object({
        workspaceId: slugSchema,
        path: collectionPathSchema,
        patch: folderSettingsPatchSchema,
    })
    .strict();

export type FolderSettingsWindowPatch = z.infer<typeof folderSettingsPatchSchema>;
export type CollectionSettingsWriteRequest = z.infer<typeof collectionSettingsWriteRequestSchema>;
