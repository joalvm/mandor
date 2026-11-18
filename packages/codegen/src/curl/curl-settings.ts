import { curlSettingsSchema, type CurlNotice, type CurlRequest } from '@mandor/schema';

import type { CurlArg } from './curl-args.js';

type Found = { settings: CurlRequest['settings']; notices: CurlNotice[] };

function outOfRange(arg: CurlArg, found: Found): void {
    found.notices.push({ code: 'settingOutOfRange', subject: arg.flag });
}

// The numbers go through the validators of the settings themselves: a value they refuse is out.
function addTimeout(arg: CurlArg, found: Found): void {
    const seconds = Number(arg.value);
    const timeout = curlSettingsSchema.shape.timeoutMs.safeParse(Math.round(seconds * 1000));

    if (!timeout.success) {
        outOfRange(arg, found);

        return;
    }

    found.settings.timeoutMs = timeout.data;
}

function addMaxRedirects(arg: CurlArg, found: Found): void {
    const redirects = curlSettingsSchema.shape.maxRedirects.safeParse(Number(arg.value));

    if (!redirects.success) {
        outOfRange(arg, found);

        return;
    }

    found.settings.maxRedirects = redirects.data;
}

function followRedirects(_arg: CurlArg, found: Found): void {
    found.settings.followRedirects = true;
}

/** Curl keeps the method on a 301 or a 302 only when told for each; either one is the setting. */
function keepMethod(_arg: CurlArg, found: Found): void {
    found.settings.keepMethodOnRedirect = true;
}

function skipTlsCheck(_arg: CurlArg, found: Found): void {
    found.settings.validateTls = false;
}

/** What each setting option writes; the other options are not settings. */
const SETTING_OF_OPTION: ReadonlyMap<string, (arg: CurlArg, found: Found) => void> = new Map([
    ['location', followRedirects],
    ['location-trusted', followRedirects],
    ['insecure', skipTlsCheck],
    ['max-time', addTimeout],
    ['max-redirs', addMaxRedirects],
    ['post301', keepMethod],
    ['post302', keepMethod],
]);

/** The settings the command names, and only those: what it does not say stays as it was. */
export function settingsOf(args: readonly CurlArg[]): Found {
    const found: Found = { settings: {}, notices: [] };

    for (const arg of args) {
        SETTING_OF_OPTION.get(arg.name)?.(arg, found);
    }

    return found;
}
