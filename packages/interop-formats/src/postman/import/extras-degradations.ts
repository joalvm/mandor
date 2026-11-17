import { degradation, type Degradation, isRecord } from '@mandor/interop-core';
import { HTTP_VERSIONS, type HttpVersion, type RequestSettings } from '@mandor/schema';

import { POSTMAN_TLS } from '../document/postman-tls.js';

export type ExtrasResult = { settings: Partial<RequestSettings>; degradations: Degradation[] };

type Subject = 'request' | 'folder';

/** The settings of each part laid one over the next, the later winning. */
function mergedSettings(
    parts: readonly (Partial<RequestSettings> | undefined)[],
): Partial<RequestSettings> {
    return parts.reduce<Partial<RequestSettings>>((all, part) => ({ ...all, ...part }), {});
}

/** Postman's list of suites is OpenSSL's, written with colons. */
function ciphersOf(value: unknown): Partial<RequestSettings> | undefined {
    const names = Array.isArray(value) ? value.filter((name) => typeof name === 'string') : [];

    return names.length === 0 ? undefined : { tlsCiphers: names.join(':') };
}

/**
 * The versions Postman left on, as the two bounds Mandor keeps. A bound is written only where
 * Postman switched something off beyond it; a hole in the middle has no bounds that say it.
 */
function tlsBoundsOf(value: unknown): Partial<RequestSettings> | undefined {
    const off = new Set(Array.isArray(value) ? value : []);
    const on = POSTMAN_TLS.map(([name]) => !off.has(name));
    const first = on.indexOf(true);
    const last = on.lastIndexOf(true);

    if (first === -1 || on.slice(first, last + 1).includes(false)) {
        return undefined;
    }

    const bounds = POSTMAN_TLS.map(([, version], index) => ({
        ...(index === first && first > 0 ? { tlsMinVersion: version } : {}),
        ...(index === last && last < on.length - 1 ? { tlsMaxVersion: version } : {}),
    }));

    return mergedSettings(bounds);
}

const SETTINGS = new Map<string, (value: unknown) => Partial<RequestSettings> | undefined>([
    [
        'followRedirects',
        (value) => (typeof value === 'boolean' ? { followRedirects: value } : undefined),
    ],
    ['maxRedirects', (value) => (typeof value === 'number' ? { maxRedirects: value } : undefined)],
    ['strictSSL', (value) => (typeof value === 'boolean' ? { validateTls: value } : undefined)],
    [
        'followOriginalHttpMethod',
        (value) => (typeof value === 'boolean' ? { keepMethodOnRedirect: value } : undefined),
    ],
    [
        'disableCookies',
        (value) => (typeof value === 'boolean' ? { useCookieJar: !value } : undefined),
    ],
    ['protocolVersion', (value) => (isHttpVersion(value) ? { httpVersion: value } : undefined)],
    [
        'followAuthorizationHeader',
        (value) =>
            typeof value === 'boolean' ? { followAuthorizationOnRedirect: value } : undefined,
    ],
    ['tlsCipherSelection', ciphersOf],
    ['tlsDisabledProtocols', tlsBoundsOf],
]);

function isHttpVersion(value: unknown): value is HttpVersion {
    return HTTP_VERSIONS.some((version) => version === value);
}

/**
 * What an operation or a folder kept that no field of Mandor claims, as the settings it can
 * hold and a sentence for each thing it cannot. Nothing is dropped without a line.
 */
export function extrasDegradations(
    extras: Record<string, unknown>,
    subject: Subject,
): ExtrasResult {
    const found = Object.entries(extras).map(([key, value]) => noteOf(key, value, subject));

    return {
        settings: mergedSettings(found.map((each) => each.settings)),
        degradations: found.flatMap((each) => each.degradations),
    };
}

function noteOf(key: string, value: unknown, subject: Subject): ExtrasResult {
    if (key === 'protocolProfileBehavior') {
        return profileOf(value, subject);
    }

    return { settings: {}, degradations: [textOf(key, value)] };
}

function profileOf(value: unknown, subject: Subject): ExtrasResult {
    if (subject === 'folder') {
        return { settings: {}, degradations: [degradation('folderSettingsNotImported')] };
    }

    const entries = Object.entries(isRecord(value) ? value : {});
    const read = entries.map(([key, each]) => [key, SETTINGS.get(key)?.(each)] as const);

    return {
        settings: mergedSettings(read.map(([, setting]) => setting)),
        degradations: read
            .filter(([, setting]) => setting === undefined)
            .map(([key]) => degradation('settingNoEquivalent', { key })),
    };
}

function textOf(key: string, value: unknown): Degradation {
    const messages = new Map([
        ['hash', degradation('urlFragmentNotKept', { fragment: String(value) })],
        ['variable', degradation('requestVariablesNotImported')],
        ['proxy', degradation('proxyNotImported')],
        ['certificate', degradation('certificateNotImported')],
        ['lost', lostText(String(value))],
    ]);

    return messages.get(key) ?? degradation('postmanKeyNotImported', { key });
}

function lostText(lost: string): Degradation {
    if (lost === 'disabledBody') {
        return degradation('disabledBody');
    }

    return degradation('bodyModeUnsupported', { mode: lost.replace(/^bodyMode:/, '') });
}
