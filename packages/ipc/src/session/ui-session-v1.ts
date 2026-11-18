import { z } from 'zod';

import { panelsSchema } from './session-panels.js';

/**
 * The format that shipped before groups existed: a flat strip of tabs with one active, and a
 * title copied into every one of them. Kept only so a window that was open before an update
 * comes back arranged the way it was left.
 */
export const uiSessionV1Schema = z
    .object({
        version: z.literal(1),
        activeWorkspaceId: z.string().trim().min(1).nullable(),
        activeTabId: z.string().trim().min(1).nullable(),
        tabs: z.array(
            z
                .object({
                    id: z.string().trim().min(1),
                    kind: z.string().trim().min(1),
                    title: z.string().trim().min(1),
                })
                .strict(),
        ),
        panels: panelsSchema,
    })
    .strict();

export type UiSessionV1 = z.infer<typeof uiSessionV1Schema>;
