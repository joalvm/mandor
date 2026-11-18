import type { ErrorCode } from '@mandor/ipc';
import type { SnippetTarget } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useEffect, useState } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';
import { snippetInputOf } from '../lib/send-input.js';

export type SnippetState =
    | { state: 'loading' }
    | { state: 'ready'; code: string; leftOutFile: string | null }
    | { state: 'failed'; error: ErrorCode };

type UseRequestSnippetInput = {
    open: boolean;
    resource: string;
    target: SnippetTarget;
};

const LOADING: SnippetState = { state: 'loading' };

/** An answer out of contract is a bug of main, not something the user did. */
const UNKNOWN: SnippetState = { error: 'unknown', state: 'failed' };

async function snippetOf(resource: string, target: SnippetTarget): Promise<SnippetState> {
    const input = snippetInputOf(resource);

    if (input === null) {
        return UNKNOWN;
    }

    try {
        const result = await syncBridge.codegen.snippet({ ...input, target });

        return result.ok
            ? { code: result.value.code, leftOutFile: result.value.leftOutFile, state: 'ready' }
            : { error: result.error.code, state: 'failed' };
    } catch {
        return UNKNOWN;
    }
}

/**
 * The request of a resource written as code, for as long as the dialog is open: asked when it
 * opens and again when the language changes. Closed, it is nothing, and an answer that arrives
 * for another language or after the dialog closed is dropped.
 */
export function useRequestSnippet({
    open,
    resource,
    target,
}: UseRequestSnippetInput): SnippetState | null {
    const [entry, setEntry] = useState<{ state: SnippetState; target: SnippetTarget } | null>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let current = true;

        fireAndForget(
            snippetOf(resource, target).then((state) => {
                if (current) {
                    setEntry({ state, target });
                }
            }),
        );

        // Whatever was read stops counting with the question it answered: a dialog opened again,
        // or on another request, waits for its own answer instead of showing the last one.
        return () => {
            current = false;
            setEntry(null);
        };
    }, [open, resource, target]);

    if (!open) {
        return null;
    }

    return entry?.target === target ? entry.state : LOADING;
}
