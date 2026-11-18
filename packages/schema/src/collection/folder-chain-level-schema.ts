import { z } from 'zod';

import { authPlaceSchema } from '../auth/auth-place-schema.js';
import type { FolderChainLevel } from './folder-chain-level.js';
import { folderSettingsSchema } from './folder-settings-schema.js';

/** One level of the chain as main hands it to the window, checked on both sides of the bridge. */
export const folderChainLevelSchema = z
    .object({
        level: z.enum(['collection', 'folder', 'workspace']),
        place: authPlaceSchema,
        name: z.string(),
        settings: folderSettingsSchema.omit({ name: true, order: true }),
        unreadable: z.literal(true).optional(),
    })
    .strict() satisfies z.ZodType<FolderChainLevel>;
