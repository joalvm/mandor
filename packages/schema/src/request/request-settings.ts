/** The HTTP a send may speak: negotiated by ALPN, or held to one version. Postman's `protocolVersion`. */
export const HTTP_VERSIONS = ['auto', 'http1', 'http2'] as const;

export type HttpVersion = (typeof HTTP_VERSIONS)[number];

/** The TLS a handshake may settle on: `auto` leaves the bound to the runtime. */
export const TLS_VERSIONS = ['auto', 'TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'] as const;

export type TlsVersion = (typeof TLS_VERSIONS)[number];

/**
 * How a send waits, follows a redirect, speaks and trusts the wire: every decision the transport
 * takes from the request, each one a setting that changes what leaves.
 */
export type RequestSettings = {
    timeoutMs: number;
    followRedirects: boolean;
    maxRedirects: number;
    /** A 301 or 302 keeps the method and the body instead of turning a POST into a GET. */
    keepMethodOnRedirect: boolean;
    validateTls: boolean;
    httpVersion: HttpVersion;
    /** The jar of the environment rides along: its cookies go out, the answer's come in. */
    useCookieJar: boolean;
    /** A redirect to another host keeps `Authorization`. Postman's `followAuthorizationHeader`. */
    followAuthorizationOnRedirect: boolean;
    /** The largest body a send downloads, in MiB; 0 downloads whatever comes. */
    maxResponseSizeMiB: number;
    /** The oldest TLS the handshake accepts. */
    tlsMinVersion: TlsVersion;
    /** The newest TLS the handshake offers. */
    tlsMaxVersion: TlsVersion;
    /** The cipher suites offered, in OpenSSL's list format; empty offers the runtime's. */
    tlsCiphers: string;
};

/**
 * What a request keeps of its own. Each setting it leaves out follows the defaults of the app,
 * so the file holds only what this request decided — and a turned-off check is a decision, so
 * it shows in the diff of the repo.
 */
export type RequestSettingsOverrides = {
    [Key in keyof RequestSettings]?: RequestSettings[Key] | undefined;
};

/** What a send does when neither the request nor the app said otherwise. */
export const DEFAULT_REQUEST_SETTINGS: RequestSettings = {
    timeoutMs: 30000,
    followRedirects: true,
    maxRedirects: 5,
    keepMethodOnRedirect: false,
    validateTls: true,
    httpVersion: 'auto',
    useCookieJar: true,
    followAuthorizationOnRedirect: false,
    // An endless or huge answer stops here instead of filling the disk; 0 lifts the cap.
    maxResponseSizeMiB: 50,
    tlsMinVersion: 'auto',
    tlsMaxVersion: 'auto',
    tlsCiphers: '',
};

/** The settings a send goes out with: what the request kept, over the defaults it follows. */
export function effectiveRequestSettings(
    overrides: RequestSettingsOverrides,
    defaults: RequestSettings = DEFAULT_REQUEST_SETTINGS,
): RequestSettings {
    // What was kept comes from disk: a setting kept empty, or one a request no longer has, falls away.
    const kept = Object.entries(overrides).filter(
        ([key, value]) => Object.hasOwn(defaults, key) && value !== undefined,
    );

    return { ...defaults, ...Object.fromEntries(kept) };
}
