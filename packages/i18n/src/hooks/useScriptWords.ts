import type { RequestScriptOutput } from '@mandor/ipc';
import { useMemo } from 'react';

import { useMessages } from './useMessages.js';

type ChainLog = RequestScriptOutput['logs'][number];

type ScriptError = NonNullable<RequestScriptOutput['error']>;

/** How the console says what the scripts and main said, in the language of the interface. */
export type ScriptWords = {
    /** The error that ended a run: the one main names in its words, a script's own as it threw. */
    error: (error: ScriptError) => string;
    /** A line a script wrote as it wrote it, or what main said in its place. */
    line: (log: ChainLog) => string;
};

/** The errors main ends a run with. Any other name is what the script itself threw. */
const ERROR_KEYS = {
    Cancelled: 'error-Cancelled',
    Closed: 'error-Closed',
    EngineTrap: 'error-EngineTrap',
    ErrorUnreadable: 'error-ErrorUnreadable',
    InvalidInput: 'error-InvalidInput',
    OutputInvalid: 'error-OutputInvalid',
    OutputTooLarge: 'error-OutputTooLarge',
    ResultNotString: 'error-ResultNotString',
    RunFailed: 'error-RunFailed',
    ScriptPending: 'error-ScriptPending',
    Timeout: 'error-Timeout',
    Violation: 'error-Violation',
    WorkerDied: 'error-WorkerDied',
    WorkerOutOfMemory: 'error-WorkerOutOfMemory',
} as const;

/** The errors that say their limit when main told it. */
const LIMIT_KEYS = { Timeout: 'error-Timeout-limit' } as const;

type ErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS] | (typeof LIMIT_KEYS)['Timeout'];

const ERROR_WORDS: Readonly<Partial<Record<string, ErrorKey>>> = ERROR_KEYS;

const LIMIT_WORDS: Readonly<Partial<Record<string, ErrorKey>>> = LIMIT_KEYS;

function keyOf(error: ScriptError): ErrorKey | undefined {
    const limited = error.limit === undefined ? undefined : LIMIT_WORDS[error.errorName];

    return limited ?? ERROR_WORDS[error.errorName];
}

/**
 * The words of the console of the scripts, alike in both apps. Main never sends a sentence: it
 * sends what happened and with what, and the window says it here.
 */
export function useScriptWords(): ScriptWords {
    const words = useMessages('scripts');

    return useMemo(
        () => ({
            error: (error) => {
                const key = keyOf(error);

                return key === undefined
                    ? `${error.errorName}: ${error.message}`
                    : words(key, { limit: error.limit });
            },
            line: (log) =>
                'text' in log ? log.text : words(`notice-${log.notice}`, { ...log.params }),
        }),
        [words],
    );
}
