import { degradation, type Degradation } from '@mandor/interop-core';
import type { RequestSettingsOverrides } from '@mandor/schema';

import type { InsomniaRequestSettings } from '../document/insomnia-tree.js';

const FOLLOW = new Map([
    ['on', true],
    ['off', false],
]);

/** The switches off that change what is sent and that Mandor has no setting for. */
const NO_PLACE = [
    ['encodeUrl', degradation('urlNotEncodedInsomnia')],
    ['rebuildPath', degradation('pathNotNormalized')],
    ['renderRequestBody', degradation('bodyNotRendered')],
] as const;

const ONE_WAY_JAR = degradation('cookiesOneWay');

/**
 * The switches of a request that Mandor holds, and a note for each that it does not. `global` and
 * a jar on say nothing: both are what Mandor does unless a request says otherwise.
 */
export function requestSettingsOf(settings: InsomniaRequestSettings): {
    settings: RequestSettingsOverrides;
    degradations: Degradation[];
} {
    const follow = FOLLOW.get(settings.followRedirects);
    const { sendCookies, storeCookies } = settings;

    return {
        settings: {
            ...(follow === undefined ? {} : { followRedirects: follow }),
            ...(sendCookies || storeCookies ? {} : { useCookieJar: false }),
        },
        degradations: [
            ...NO_PLACE.filter(([part]) => !settings[part]).map(([, note]) => note),
            ...(sendCookies === storeCookies ? [] : [ONE_WAY_JAR]),
        ],
    };
}
