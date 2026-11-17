/**
 * Why a request ended without a response. The list is closed: every reason a request can die
 * has a name here, and a consumer can switch over it without a default branch for the unknown.
 * New transport behaviour extends this list; it never comes with a bare `Error`.
 */
export type SyncSendReason =
    | 'scheme'
    | 'dns'
    | 'refused'
    | 'timeout-connect'
    | 'timeout-total'
    | 'aborted'
    | 'tls'
    | 'http-version'
    | 'redirect-scheme'
    | 'redirect-limit'
    /** The proxy speaks a protocol no agent of the transport dials. */
    | 'proxy-scheme'
    /** The body grew past the largest the request allows. */
    | 'too-large'
    | 'unknown';
