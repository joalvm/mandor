import { METHOD_PATTERN, type CurlNotice } from '@mandor/schema';

import type { CurlArg } from './curl-args.js';

function chosenMethod(args: readonly CurlArg[], hasBody: boolean): string {
    if (args.some((arg) => arg.name === 'head')) {
        return 'HEAD';
    }

    if (args.some((arg) => arg.name === 'get')) {
        return 'GET';
    }

    return hasBody ? 'POST' : 'GET';
}

/**
 * The method: `-X` first, then `-I`, then `-G`, then POST if there is a body. A `-X` that is not a
 * token is ignored and said, so a request is never left with a method no server could read.
 */
export function methodOf(
    args: readonly CurlArg[],
    hasBody: boolean,
): { method: string; notices: CurlNotice[] } {
    const written = args.findLast((arg) => arg.name === 'request')?.value?.toUpperCase();

    if (written === undefined) {
        return { method: chosenMethod(args, hasBody), notices: [] };
    }

    if (METHOD_PATTERN.test(written)) {
        return { method: written, notices: [] };
    }

    return {
        method: chosenMethod(args, hasBody),
        notices: [{ code: 'unsupportedOption', subject: '--request' }],
    };
}
