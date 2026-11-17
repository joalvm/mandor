import { definedOnly, isRecord } from '@mandor/interop-core';

import type { BrunoSettings } from './bruno-tree.js';

function flagOf(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function numberOf(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

/**
 * The settings a request decides, in OpenCollection or in `.bru`, which name them alike. A value
 * that says `inherit` decides nothing, and neither does one of the wrong type.
 */
export function settingsOf(value: unknown): BrunoSettings {
    const settings = isRecord(value) ? value : {};

    return definedOnly({
        encodeUrl: flagOf(settings['encodeUrl']),
        timeout: numberOf(settings['timeout']),
        followRedirects: flagOf(settings['followRedirects']),
        maxRedirects: numberOf(settings['maxRedirects']),
        forwardAuthorizationHeader: flagOf(settings['forwardAuthorizationHeader']),
    });
}
