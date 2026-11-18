/**
 * The app's port for cookies: what the jar says to send to a URL, and where each `Set-Cookie`
 * the wire brought goes. The transport calls it on every hop of a redirect chain, so a cookie
 * set by a `302` reaches the next hop and each hop gets only what its own URL matches. The jar
 * itself — format, rules, disk — is the app's, never the transport's.
 */
export type CookiePort = {
    /** The `Cookie` header value for the URL, or `null` when no cookie matches. */
    header: (url: string) => Promise<string | null>;
    /** Hands the raw `Set-Cookie` lines of a response, one per cookie, to the jar. */
    store: (url: string, setCookies: readonly string[]) => Promise<void>;
};
