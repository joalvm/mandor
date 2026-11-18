import { chainLogSchema, scriptTestSchema, skippedScriptSchema } from '@mandor/schema';
import { z } from 'zod';

/** How much of a value of a script the window sees. */
const PREVIEW_CHARS = 256;

/**
 * What the scripts of one run said, as the window reads it after a send or on a connection: what
 * they wrote, the cases they named, the scripts left out, the runs the switch of this machine
 * stopped, the values they set, and the secrets left as their name. Every text in it is already
 * redacted in main.
 */
export const SCRIPT_SAID_SHAPE = {
    logs: z.array(chainLogSchema),
    tests: z.array(scriptTestSchema),
    skipped: z.array(skippedScriptSchema),
    /** The runs that would have been, had the switch of this machine been on. */
    switchedOff: z.number().int().nonnegative(),
    variables: z.array(
        z.object({ name: z.string(), preview: z.string().max(PREVIEW_CHARS) }).strict(),
    ),
    /** The secrets left as their name, because a script had a hand in what went out. */
    withheld: z.array(z.string()),
};
