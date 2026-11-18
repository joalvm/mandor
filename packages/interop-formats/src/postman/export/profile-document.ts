import { definedOnly, type FormatDocument } from '@mandor/interop-core';
import type { RequestSettingsOverrides, TlsVersion } from '@mandor/schema';

import { POSTMAN_TLS } from '../document/postman-tls.js';

function disableCookiesOf(useCookieJar: boolean | undefined): boolean | undefined {
    return useCookieJar === undefined ? undefined : !useCookieJar;
}

function ciphersOf(ciphers: string | undefined): string[] | undefined {
    return ciphers === undefined || ciphers === '' ? undefined : ciphers.split(':');
}

/** Postman says the bounds as the versions it leaves out: those below one and above the other. */
function disabledOf({
    tlsMinVersion,
    tlsMaxVersion,
}: RequestSettingsOverrides): string[] | undefined {
    const versions: readonly TlsVersion[] = POSTMAN_TLS.map(([, version]) => version);
    const first = Math.max(versions.indexOf(tlsMinVersion ?? 'auto'), 0);
    const named = versions.indexOf(tlsMaxVersion ?? 'auto');
    const last = named === -1 ? versions.length - 1 : named;
    const off = POSTMAN_TLS.filter((_, index) => index < first || index > last);

    return off.length === 0 ? undefined : off.map(([name]) => name);
}

/**
 * The settings of a request that Postman has too, under its names; a request that decides none of
 * them writes no key. The timeout and the size of a download have no place in a collection.
 */
export function profileDocumentOf(settings: RequestSettingsOverrides): FormatDocument {
    const profile = definedOnly({
        followRedirects: settings.followRedirects,
        maxRedirects: settings.maxRedirects,
        strictSSL: settings.validateTls,
        followOriginalHttpMethod: settings.keepMethodOnRedirect,
        disableCookies: disableCookiesOf(settings.useCookieJar),
        protocolVersion: settings.httpVersion,
        followAuthorizationHeader: settings.followAuthorizationOnRedirect,
        tlsCipherSelection: ciphersOf(settings.tlsCiphers),
        tlsDisabledProtocols: disabledOf(settings),
    });

    return Object.keys(profile).length === 0 ? {} : { protocolProfileBehavior: profile };
}
