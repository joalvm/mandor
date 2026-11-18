import { snippetTargetSchema } from '@mandor/schema';
import { z } from 'zod';

import { requestSendRequestSchema } from '../request/request-send.js';
import { resultSchema } from '../result/result-schema.js';

/**
 * Writes the request on screen as code: what a send takes, without the id of the send, plus the
 * language. Main resolves it as a send would and hides every secret before the library writes.
 */
export const codegenSnippetRequestSchema = requestSendRequestSchema
    .omit({ sendId: true, skipScripts: true })
    .extend({ target: snippetTargetSchema })
    .strict();

/** `leftOutFile` is the file of a binary body, which the snippet does not read. */
const codegenSnippetSchema = z
    .object({ code: z.string(), leftOutFile: z.string().nullable() })
    .strict();

export const codegenSnippetResultSchema = resultSchema(codegenSnippetSchema);

export type CodegenSnippetRequest = z.infer<typeof codegenSnippetRequestSchema>;
export type CodegenSnippet = z.infer<typeof codegenSnippetSchema>;
