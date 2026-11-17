import type { ChainLog, ScriptNotice } from '@mandor/schema';

/** A line as a test reads it: the text a script wrote, or the notice the API left instead. */
export function lineOf(log: ChainLog | undefined): string | ScriptNotice | undefined {
    return log === undefined || !('text' in log) ? log : log.text;
}

/** The text a script wrote on the line, or none when the line is not one a script wrote. */
export function textOf(log: ChainLog | undefined): string {
    return log !== undefined && 'text' in log ? log.text : '';
}
