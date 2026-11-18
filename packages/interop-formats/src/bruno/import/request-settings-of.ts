import { degradation, type Degradation } from '@mandor/interop-core';
import {
    requestSettingsSchema,
    type RequestSettings,
    type RequestSettingsOverrides,
} from '@mandor/schema';

import type { BrunoSettings } from '../document/bruno-tree.js';

type SettingsMapping = { settings: RequestSettingsOverrides; degradations: Degradation[] };

/** A value Mandor would refuse (a timeout of 0, say) leaves the setting to the defaults. */
function accepted(key: keyof RequestSettings, value: unknown): boolean {
    return value !== undefined && requestSettingsSchema.safeParse({ [key]: value }).success;
}

/** What a request of Bruno decides, under the names Mandor gives it, and what has no setting. */
export function requestSettingsOf(settings: BrunoSettings): SettingsMapping {
    const named: [keyof RequestSettings, unknown][] = [
        ['timeoutMs', settings.timeout],
        ['followRedirects', settings.followRedirects],
        ['maxRedirects', settings.maxRedirects],
        ['followAuthorizationOnRedirect', settings.forwardAuthorizationHeader],
    ];

    return {
        settings: Object.fromEntries(named.filter(([key, value]) => accepted(key, value))),
        degradations: settings.encodeUrl === false ? [degradation('urlNotEncodedBruno')] : [],
    };
}
