import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    codegenFromCurlResultSchema,
    codegenSnippetResultSchema,
    type CodegenArea,
} from '@mandor/ipc';

/**
 * Reads a curl command and writes a request as code. Every answer is validated at this edge,
 * like those of the other areas: a response out of contract is a bug in main, louder thrown than
 * shown.
 */
export function createCodegenBridge({ call }: BridgeKit): CodegenArea {
    return {
        fromCurl: (input) => call(CHANNELS.codegenFromCurl, codegenFromCurlResultSchema, input),
        snippet: (input) => call(CHANNELS.codegenSnippet, codegenSnippetResultSchema, input),
    };
}
