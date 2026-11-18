import { curlRequestOf, snippetOf, SnippetError, type SnippetRequest } from '@mandor/codegen';
import { activeRepo, redactMessage, type HandlerIpc, type ReadSecretValue } from '@mandor/host';
import {
    CHANNELS,
    codegenFromCurlRequestSchema,
    codegenSnippetRequestSchema,
    failure,
    success,
    type CodegenSnippetRequest,
    type Result,
} from '@mandor/ipc';
import type { CurlParse } from '@mandor/schema';

import { failureOfSend } from '../request/failure-of-send.js';
import { resolvedRequestOf } from '../request/resolve-request.js';
import { snippetRequestOf } from './snippet-request-of.js';

export type CodegenHandlerDeps = {
    readSecret: ReadSecretValue;
};

type Snippet = { code: string; leftOutFile: string | null };

function fromCurl(raw: unknown): Result<CurlParse> {
    const input = codegenFromCurlRequestSchema.safeParse(raw);

    return input.success
        ? success(curlRequestOf(input.data.text))
        : failure('bad-request', input.error.message);
}

async function snippetOfInput(
    deps: CodegenHandlerDeps,
    input: CodegenSnippetRequest,
): Promise<Result<Snippet>> {
    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    const place = { root: repo.value.root, repo: repo.value.id, readSecret: deps.readSecret };
    const resolved = await resolvedRequestOf(place, input, {
        signal: new AbortController().signal,
        tokens: 'placeholder',
    });

    if (!resolved.ok) {
        return resolved;
    }

    const { request, leftOutFile } = snippetRequestOf(resolved.value);
    // Before the library: it encodes the url, and a secret already encoded no longer matches.
    // Only what was marked secret is hidden; a value written by hand leaves as it was written.
    const safe = redactMessage(request) as SnippetRequest;

    try {
        const code = snippetOf(safe, input.target, resolved.value.settings);

        return success({ code, leftOutFile });
    } catch (error) {
        if (error instanceof SnippetError) {
            return failure('snippet-failed', error.message);
        }

        throw error;
    }
}

async function snippet(deps: CodegenHandlerDeps, raw: unknown): Promise<Result<Snippet>> {
    const input = codegenSnippetRequestSchema.safeParse(raw);

    if (!input.success) {
        return failure('bad-request', input.error.message);
    }

    try {
        return await snippetOfInput(deps, input.data);
    } catch (error) {
        // The same refusals a send gives for the same request, from the same function.
        return failureOfSend(error);
    }
}

/**
 * The two channels of the code of a request: a curl command read into a request, and a request
 * written as code in the language the user picks. Neither sends anything or writes to disk; the
 * snippet leaves redacted, and the wrapping of the channel redacts what leaves once more.
 */
export function registerCodegenHandlers(ipc: HandlerIpc, deps: CodegenHandlerDeps): () => void {
    ipc.handle(CHANNELS.codegenFromCurl, (_event, raw) => Promise.resolve(fromCurl(raw)));
    ipc.handle(CHANNELS.codegenSnippet, (_event, raw) => snippet(deps, raw));

    return () => {
        ipc.removeHandler(CHANNELS.codegenFromCurl);
        ipc.removeHandler(CHANNELS.codegenSnippet);
    };
}
