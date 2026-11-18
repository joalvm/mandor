/**
 * One line of a check block, read and answered. The grammar is three tokens at most — verb,
 * what it looks at, and what it looks for — because a phase that needs more than that to say
 * what it delivered has not decided what it delivers.
 */

import { VERBS } from './check-verbs.mjs';

const LINE = /^(\S+)\s+(\S+)(?:\s+(.*))?$/;

/** A literal comes quoted and a pattern slashed, so a check never guesses which one it got. */
function valueOf(raw) {
    if (raw === undefined) {
        return undefined;
    }

    const quoted = /^"(.*)"$/.exec(raw);

    if (quoted !== null) {
        return quoted[1];
    }

    const slashed = /^\/(.*)\/$/.exec(raw);

    return slashed === null ? raw : slashed[1];
}

/** What the line got wrong, or nothing at all when the plan told the truth. */
export function checkProblem(line) {
    const parsed = LINE.exec(line);

    if (parsed === null) {
        return `\`${line}\` is not a check. Write: verb target [value]`;
    }

    const [, verb, target, raw] = parsed;
    const run = VERBS[verb];

    if (run === undefined) {
        return `\`${verb}\` is not a check verb. There are: ${Object.keys(VERBS).join(', ')}`;
    }

    return run(target, valueOf(raw));
}
