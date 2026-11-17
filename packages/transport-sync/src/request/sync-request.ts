import type { CookiePort } from '../cookie/cookie-port.js';
import type { BodySpill } from '../response/body-spill.js';

/**
 * The HTTP a send speaks. `auto` offers `h2` and `http/1.1` by ALPN and takes what the server
 * picks; `http1` offers only `http/1.1`; `http2` offers only `h2` and dies with `http-version`
 * when the connection does not end up speaking it (a plain `http:` URL never does: no h2c).
 */
export type SyncHttpVersion = 'auto' | 'http1' | 'http2';

/** A bound of the TLS a handshake may settle on, as Node names the versions. */
export type SyncTlsVersion = 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';

/** The pair a Digest challenge is answered with: the first send goes without it. */
export type SyncDigestAuth = { scheme: 'digest'; username: string; password: string };

/** The keys AWS Signature Version 4 signs with. Region and service left out come from the host. */
export type SyncAwsAuth = {
    scheme: 'awsv4';
    accessKeyId: string;
    secretAccessKey: string;
    region?: string | undefined;
    service?: string | undefined;
    sessionToken?: string | undefined;
};

/**
 * The credentials a scheme works out against the request itself, so the transport applies them
 * on every hop of the same origin: a signature covers the url, the headers and the body.
 */
export type SyncAuth = SyncDigestAuth | SyncAwsAuth;

/**
 * The secrets of a send a script shaped, as a hop to another origin must treat them. The lines
 * named in `headers` leave on that hop, `Authorization` too when the request keeps it. A hop that
 * would carry a body with a secret, or whose location holds one of `spellings`, is not followed:
 * the 3xx is the answer.
 */
export type CrossOriginGuard = {
    /** Names of the lines that resolved a secret, any case. */
    headers: readonly string[];
    bodySecret: boolean;
    /** The forms a secret takes on the wire. */
    spellings: readonly string[];
};

/**
 * A request the transport sends, resolved and template-free: what arrives here is final.
 * Headers are a list, not a map: order matters on the wire and repeated names are legal
 * (two `Set-Cookie` are two lines). The transport owns nothing outside this shape.
 */
export type SyncRequest = {
    /** Free-form method, upper case; the spec lets the user type it by hand. */
    method: string;
    /** Already-resolved absolute URL: `assertHttpUrl` lets only `http:` and `https:` through. */
    url: string;
    headers: readonly (readonly [string, string])[];
    body?: Uint8Array | undefined;
    timeouts: {
        connectMs: number;
        totalMs: number;
    };
    redirects: {
        follow: boolean;
        max: number;
        /** A 301 or 302 keeps the method and the body instead of turning a POST into a GET. */
        keepMethod?: boolean | undefined;
        /** A hop to another origin keeps `Authorization`; the cookies and the proxy's still leave. */
        keepAuthorization?: boolean | undefined;
        /** What a send a script shaped may not take to another origin. Absent: the rules of today. */
        crossOriginGuard?: CrossOriginGuard | undefined;
    };
    tls: {
        verify: boolean;
        ca?: string;
        /** A PEM pair, or a PKCS#12 bundle as its bytes; the passphrase opens whichever key. */
        clientCert?: { cert?: string; key?: string; pfx?: Uint8Array; passphrase?: string };
        /** The oldest TLS accepted. Absent: the runtime's. */
        minVersion?: SyncTlsVersion | undefined;
        /** The newest TLS offered. Absent: the runtime's. */
        maxVersion?: SyncTlsVersion | undefined;
        /** The cipher suites offered, in OpenSSL's list format. Absent: the runtime's. */
        ciphers?: string | undefined;
    };
    /** The largest body a hop may bring, decoded, in bytes; past it the send dies. Absent: no limit. */
    maxResponseBytes?: number | undefined;
    /** Absent, `auto`. */
    httpVersion?: SyncHttpVersion | undefined;
    proxy?: { url: string } | undefined;
    /**
     * How a hop to another url reaches the network: the proxy and the certificates of its own
     * host. `proxy` and `tls` are those of the first url; a redirect that leaves for another host
     * must not show it the client certificate of the first, nor skip the proxy the first bypassed.
     * Absent, every hop dials as the first.
     */
    dial?: ((url: string) => Promise<Pick<SyncRequest, 'proxy' | 'tls'>>) | undefined;
    /** Worked out on each hop of the origin the request starts at; a header written by hand wins. */
    auth?: SyncAuth | undefined;
    /** The app's jar, asked on every hop of the chain; without it no cookie is added or kept. */
    cookies?: CookiePort | undefined;
    /** The app's port for bodies over the threshold; the transport calls it, never asks for more. */
    spill: SpillPort;
};

/**
 * The app's port for bodies over the threshold: how big a body may stay in memory, and where
 * the bytes go once it is not. The transport calls `open` at most once per response, when the
 * decoded body crosses the limit, and writes there until the body ends or dies.
 */
export type SpillPort = {
    thresholdBytes: number;
    open: () => Promise<BodySpill>;
};
