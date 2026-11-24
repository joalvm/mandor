import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { itemOriginSchema } from '../collection/item-origin-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import type { Workspace } from './workspace.js';
import { WORKSPACE_KINDS } from './workspace-kinds.js';

export const workspaceSchema = z.object({
    id: slugSchema,
    kind: z.enum(WORKSPACE_KINDS),
    name: entityNameSchema,
    auth: authConfigSchema.optional(),
    importOrigin: itemOriginSchema.optional(),
    defaultEnvironment: slugSchema.optional(),
}) satisfies z.ZodType<Workspace>;
