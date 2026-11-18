import { repoSchema, type Repo } from '@mandor/schema';
import { z } from 'zod';

import { listedWorkspaceSchema, type ListedWorkspace } from '../workspace/workspace-list.js';

/** What switching to an origin hands to the renderer: its repo and its workspaces. */
export type OpenedOrigin = {
    repo: Repo | null;
    workspaces: ListedWorkspace[];
};

// The response composes the domain schemas instead of restating them, so a domain change
// that forgets this channel stops compiling here.
export const openedOriginSchema = z.object({
    repo: repoSchema.nullable(),
    workspaces: z.array(listedWorkspaceSchema),
}) satisfies z.ZodType<OpenedOrigin>;
