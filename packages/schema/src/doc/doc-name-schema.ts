import { z } from 'zod';

import { isDocName } from './doc-name.js';

/**
 * The border check. A doc name arrives from the renderer and ends up in a `join`, so it is
 * validated where main receives it and not where disk is finally touched.
 */
export const docNameSchema = z.string().refine(isDocName, { error: 'Not a doc file name' });
