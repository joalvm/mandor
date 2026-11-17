import { z } from 'zod';

import { SCRIPT_EVENTS, SCRIPT_LEVELS } from './own-scripts.js';

/** One line a script wrote to the console. */
export const scriptLogSchema = z.object({
    level: z.enum(['log', 'info', 'warn', 'error']),
    text: z.string(),
});

export type ScriptLog = z.infer<typeof scriptLogSchema>;

/**
 * What main says about a run, never as a sentence: a code the window turns into a line in the
 * language of the interface, with the values it interpolates. A script cannot write one.
 */
const SCRIPT_NOTICE_CODES = [
    'body-not-writable',
    'chain-too-long',
    'collection-unreadable',
    'effect-name-forbidden',
    'effect-not-in-event',
    'effects-text-too-large',
    'effects-too-many-sends',
    'effects-too-many-variables',
    'effects-variable-too-large',
    'effects-variables-too-large',
    'folder-unreadable',
    'lines-cut',
    'message-field-readonly',
    'message-too-large',
    'no-reconnect',
    'note-cut',
    'output-cut',
    'queue-full',
    'request-field-readonly',
    'response-body-unreadable',
    'script-too-large',
    'secret-unreadable',
    'sends-dropped',
    'socket-sends-cap',
    'variables-full',
] as const;

export const scriptNoticeSchema = z
    .object({
        level: z.literal('warn'),
        notice: z.enum(SCRIPT_NOTICE_CODES),
        params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })
    .strict();

export type ScriptNotice = z.infer<typeof scriptNoticeSchema>;

/** A notice of `notice`, with the values its line interpolates when it has any. */
export function scriptNotice(
    notice: ScriptNotice['notice'],
    params?: ScriptNotice['params'],
): ScriptNotice {
    return params === undefined ? { level: 'warn', notice } : { level: 'warn', notice, params };
}

/** One line of the console of the scripts: what a script wrote, or what main says of the run. */
export const chainLogSchema = z.union([scriptNoticeSchema, scriptLogSchema]);

export type ChainLog = z.infer<typeof chainLogSchema>;

/** A case a script named with `test`, and whether it held. */
export const scriptTestSchema = z.object({
    name: z.string(),
    passed: z.boolean(),
    message: z.string().optional(),
});

export type ScriptTest = z.infer<typeof scriptTestSchema>;

/**
 * Why a script stopped. The place is there only when it is known: the line is the one of the
 * script, not of what wraps it, and without a reliable one it does not go.
 */
export const scriptErrorSchema = z.object({
    message: z.string(),
    errorName: z.string(),
    line: z.number().int().optional(),
    column: z.number().int().optional(),
    /** The visible name of the level the script was written at. */
    level: z.string().optional(),
    event: z.string().optional(),
    /** The visible name of what holds the script. */
    name: z.string().optional(),
    /** The bound a run went past, for an error main or the engine raised on one. */
    limit: z.number().int().nonnegative().optional(),
});

export type ScriptError = z.infer<typeof scriptErrorSchema>;

/**
 * A script that did not run because nobody approved it. `source` goes only while the whole output
 * fits: a text that does not fit is not offered for approval, because nobody saw it.
 */
export const skippedScriptSchema = z.object({
    name: z.string(),
    level: z.enum(SCRIPT_LEVELS),
    event: z.enum(SCRIPT_EVENTS),
    bytes: z.number().int().nonnegative(),
    source: z.string().optional(),
});

export type SkippedScript = z.infer<typeof skippedScriptSchema>;
