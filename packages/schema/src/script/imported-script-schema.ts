import { z } from 'zod';

import { IMPORTED_SCRIPT_EVENTS, type ImportedScript, SCRIPT_DIALECTS } from './imported-script.js';

export const importedScriptSchema = z
    .object({
        event: z.enum(IMPORTED_SCRIPT_EVENTS),
        dialect: z.enum(SCRIPT_DIALECTS),
        source: z.string(),
    })
    .strict() satisfies z.ZodType<ImportedScript>;
