import { z } from 'zod';

import { languageSchema } from '../language/language-schema.js';

export const menuLanguageRequestSchema = z.object({ language: languageSchema }).strict();

export type MenuLanguageRequest = z.infer<typeof menuLanguageRequestSchema>;
