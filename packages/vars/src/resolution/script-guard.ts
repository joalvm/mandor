import type { UsedVariable } from './resolve-text-result.js';
import { sameDestination } from './same-destination.js';

/** What a send looked like before and after its scripts, as the guard reads it. */
export type ScriptGuardInput = {
    /** The final URL resolved without the script level and without the effects of a script. */
    base: string;
    /** The final URL that goes out. */
    final: string;
    /** A script wrote the `Host` header. */
    wroteHost: boolean;
    /** The `Host` header resolves to another value once the script level takes part. */
    hostMoved: boolean;
    /** A script wrote some field or line of the request. */
    written: boolean;
    /** The names the send resolved, with the level each came from. */
    used: readonly UsedVariable[];
};

/** What the send must do about its secrets. */
export type ScriptGuardVerdict = {
    /** A script shaped what goes out: it wrote something, or a line read a variable it set. */
    influenced: boolean;
    /** The send no longer goes where the person pointed it: nothing secret may follow it. */
    destinationMoved: boolean;
};

/**
 * The rule both apps apply to a send that ran scripts. The destination moved when the final
 * origin is not the base one, or when a script touched `Host` in either way; it was influenced when
 * a script wrote anything, or when a value of the script level resolved into it.
 */
export function scriptGuard(input: ScriptGuardInput): ScriptGuardVerdict {
    const { base, final, wroteHost, hostMoved, written, used } = input;

    return {
        influenced: written || used.some((entry) => entry.level === 'script'),
        destinationMoved: !sameDestination(base, final) || wroteHost || hostMoved,
    };
}
