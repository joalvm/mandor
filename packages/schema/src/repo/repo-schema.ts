import { z } from 'zod';

import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { REPO_FORMAT } from './repo-format.js';
import type { Repo } from './repo.js';

export const repoSchema = z
    .object({
        formatVersion: z.number().int().positive().max(REPO_FORMAT),
        name: entityNameSchema,
        workspaces: z.array(slugSchema),
    })
    .superRefine(addDuplicateWorkspaceIssues) satisfies z.ZodType<Repo>;

function addDuplicateWorkspaceIssues(repo: Repo, context: z.RefinementCtx): void {
    const seen = new Set<string>();

    for (const [index, workspaceId] of repo.workspaces.entries()) {
        if (seen.has(workspaceId)) {
            context.addIssue({
                code: 'custom',
                path: ['workspaces', index],
                message: 'Workspace id appears more than once in display order',
            });
        }

        seen.add(workspaceId);
    }
}
