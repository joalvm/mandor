import {
    effectiveRequestSettings,
    type HttpVersion,
    type RequestItem,
    type RequestSettings,
    type TlsVersion,
} from '@mandor/schema';
import type { SyncTlsVersion } from '@mandor/transport-sync';

const MAX_CONNECT_MS = 10_000;
const MIB = 1024 * 1024;

/** How a send travels, as the transport takes it. */
export type WireSettings = {
    timeouts: { connectMs: number; totalMs: number };
    redirects: { follow: boolean; max: number; keepMethod: boolean; keepAuthorization: boolean };
    tls: {
        verify: boolean;
        minVersion?: SyncTlsVersion | undefined;
        maxVersion?: SyncTlsVersion | undefined;
        ciphers?: string;
    };
    httpVersion: HttpVersion;
    /** Whether the jar of the environment rides along: off, the send carries only its own cookies. */
    cookieJar: boolean;
    /** The largest body a hop may bring, in bytes. Absent: whatever comes. */
    maxResponseBytes?: number;
};

/** A version the handshake is held to; `auto` holds it to none and leaves the runtime its own. */
function heldVersion(version: TlsVersion): SyncTlsVersion | undefined {
    if (version === 'auto') {
        return undefined;
    }

    return version;
}

/** The trust and the handshake: `auto` and an empty list leave the runtime its own. */
function tlsOf(settings: RequestSettings): WireSettings['tls'] {
    const { tlsMinVersion, tlsMaxVersion, tlsCiphers } = settings;

    return {
        verify: settings.validateTls,
        minVersion: heldVersion(tlsMinVersion),
        maxVersion: heldVersion(tlsMaxVersion),
        ...(tlsCiphers.trim() === '' ? {} : { ciphers: tlsCiphers.trim() }),
    };
}

/** The settings as the transport takes them; whatever the request left out follows the defaults. */
export function wireSettingsOf(overrides: RequestItem['settings']): WireSettings {
    const settings = effectiveRequestSettings(overrides);
    const limit = settings.maxResponseSizeMiB;

    return {
        timeouts: {
            connectMs: Math.min(MAX_CONNECT_MS, settings.timeoutMs),
            totalMs: settings.timeoutMs,
        },
        redirects: {
            follow: settings.followRedirects,
            max: settings.maxRedirects,
            keepMethod: settings.keepMethodOnRedirect,
            keepAuthorization: settings.followAuthorizationOnRedirect,
        },
        tls: tlsOf(settings),
        httpVersion: settings.httpVersion,
        cookieJar: settings.useCookieJar,
        ...(limit === 0 ? {} : { maxResponseBytes: limit * MIB }),
    };
}
