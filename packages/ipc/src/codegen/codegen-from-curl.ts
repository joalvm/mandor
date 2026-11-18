import { curlParseSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The longest paste read as curl. A command longer than this is not a command. */
export const CURL_TEXT_MAX = 65_536;

export const codegenFromCurlRequestSchema = z
    .object({ text: z.string().min(1).max(CURL_TEXT_MAX) })
    .strict();

/** A curl that cannot be read is a success with `kind: 'invalid'`: the window says why. */
export const codegenFromCurlResultSchema = resultSchema(curlParseSchema);

export type CodegenFromCurlRequest = z.infer<typeof codegenFromCurlRequestSchema>;
