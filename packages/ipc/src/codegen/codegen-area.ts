import type { CurlParse } from '@mandor/schema';

import type { Result } from '../result/result.js';
import type { CodegenFromCurlRequest } from './codegen-from-curl.js';
import type { CodegenSnippet, CodegenSnippetRequest } from './codegen-snippet.js';

/**
 * What a window of Sync asks of main to read a pasted curl and to write a request as code. Only
 * Sync serves it, so it sits beside its channels and not in the core.
 */
export type CodegenArea = {
    /** Reads a curl command; one that cannot be read is a result that says why. */
    fromCurl: (input: CodegenFromCurlRequest) => Promise<Result<CurlParse>>;
    /** Writes the request as a send would make it, redacted, in one language. */
    snippet: (input: CodegenSnippetRequest) => Promise<Result<CodegenSnippet>>;
};
