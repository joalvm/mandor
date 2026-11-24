import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { plainVariableSchema } from '../environment/plain-variable-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { requestLineSchema } from '../request/request-item-schema.js';
import { requestScriptsSchema } from '../script/own-scripts-schema.js';
import { itemOriginSchema } from './item-origin-schema.js';

/**
 * What a collection and a folder say about themselves: `collection.yaml` at the first level,
 * `folder.yaml` below it, one shape under two names. A folder moved to the top keeps its file
 * and only changes its name, so nothing a level wrote is lost when it changes level.
 */
export const folderSettingsSchema = z.object({
    name: entityNameSchema,
    // Optional in the file, never in the value: a group nobody arranged has an empty order,
    // and one that arrived without the key is exactly that.
    order: z.array(slugSchema).optional(),
    description: z.string().optional(),
    // Absent is the same as none: the items below resolve against the levels above.
    variables: z.array(plainVariableSchema).optional(),
    auth: authConfigSchema.optional(),
    // Lines every request below sends, with the shape of a request's own. Only the tree has them:
    // they say which API is spoken to, and neither the workspace nor an environment says that.
    headers: z.array(requestLineSchema).optional(),
    importOrigin: itemOriginSchema.optional(),
    scripts: requestScriptsSchema.optional(),
});
