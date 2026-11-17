import type { ErrorCode } from '@mandor/ipc';

import type { SnippetState } from '../hooks/useRequestSnippet.js';

/** Why the code could not be written; nothing while it is being written or once it is. */
export function snippetFailure(snippet: SnippetState | null): ErrorCode | null {
    if (snippet?.state !== 'failed') {
        return null;
    }

    return snippet.error;
}

/** The file a snippet could not carry, said under the code; nothing until the code is there. */
export function snippetLeftOutFile(snippet: SnippetState | null): string | null {
    if (snippet?.state !== 'ready') {
        return null;
    }

    return snippet.leftOutFile;
}
