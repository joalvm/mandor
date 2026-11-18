type CurlOptionKind = 'read' | 'silent' | 'unsupported';
export type CurlOption = { name: string; takesValue: boolean; kind: CurlOptionKind };

/** A long list that is only read: one text, split at its spaces. */
function wordsOf(text: string): string[] {
    return text.trim().split(/\s+/);
}

// One group per kind and arity. `name:letter` is the long name and its short letter.
const GROUPS: readonly { kind: CurlOptionKind; takesValue: boolean; specs: readonly string[] }[] = [
    {
        kind: 'read',
        takesValue: true,
        specs: [
            'request:X',
            'header:H',
            'data:d',
            'data-ascii',
            'data-raw',
            'data-binary',
            'data-urlencode',
            'json',
            'form:F',
            'form-string',
            'user:u',
            'cookie:b',
            'user-agent:A',
            'referer:e',
            'max-redirs',
            'max-time:m',
            'url',
            'oauth2-bearer',
            'url-query',
            'range:r',
        ],
    },
    {
        kind: 'read',
        takesValue: false,
        specs: [
            'get:G',
            'head:I',
            'location:L',
            'location-trusted',
            'insecure:k',
            'post301',
            'post302',
        ],
    },
    {
        kind: 'silent',
        takesValue: false,
        specs: wordsOf(`
        silent:s show-error:S verbose:v include:i no-buffer:N fail:f fail-with-body
        globoff:g progress-bar:# remote-name:O remote-header-name:J compressed
        no-progress-meter no-keepalive path-as-is http1.0:0 http1.1 http2
        http2-prior-knowledge http3 ipv4:4 ipv6:6 ssl-no-revoke digest ntlm negotiate
        anyauth basic tlsv1 tlsv1.0 tlsv1.1 tlsv1.2 tlsv1.3 sslv2 sslv3 ssl ssl-reqd
        false-start http0.9 raw tr-encoding tcp-nodelay tcp-fastopen no-sessionid no-alpn
        no-npn no-clobber create-dirs disable:q junk-session-cookies:j ignore-content-length
        remote-time:R remote-name-all styled-output no-styled-output parallel:Z
        parallel-immediate disallow-username-in-url proxy-insecure netrc:n netrc-optional
        doh-insecure cert-status suppress-connect-headers trace-time xattr append:a crlf
        use-ascii:B list-only:l show-headers ca-native http3-only retry-all-errors
        retry-connrefused
        `),
    },
    {
        kind: 'silent',
        takesValue: true,
        specs: wordsOf(`
        output:o write-out:w retry retry-delay retry-max-time connect-timeout cookie-jar:c
        dump-header:D stderr trace trace-ascii limit-rate speed-time:y speed-limit:Y
        keepalive-time keepalive-cnt proto proto-default proto-redir noproxy tls-max ciphers
        tls13-ciphers curves dns-servers dns-interface dns-ipv4-addr dns-ipv6-addr doh-url
        etag-save etag-compare expect100-timeout happy-eyeballs-timeout-ms local-port
        max-filesize output-dir parallel-max rate time-cond:z create-file-mode libcurl krb
        login-options netrc-file pinnedpubkey crlfile tlsuser tlspassword tlsauthtype
        service-name alt-svc hsts
        `),
    },
    {
        kind: 'unsupported',
        takesValue: true,
        specs: [
            'proxy:x',
            'proxy-user:U',
            'cert:E',
            'key',
            'cacert',
            'capath',
            'cert-type',
            'key-type',
            'pass',
            'upload-file:T',
            'resolve',
            'connect-to',
            'unix-socket',
            'abstract-unix-socket',
            'interface',
            'config:K',
            'preproxy',
            'socks4',
            'socks4a',
            'socks5',
            'socks5-hostname',
            'aws-sigv4',
        ],
    },
];

const OPTIONS = new Map<string, CurlOption>();
const SHORT = new Map<string, string>();

function register(spec: string, { kind, takesValue }: Omit<CurlOption, 'name'>): void {
    const [name = '', letter] = spec.split(':');

    OPTIONS.set(name, { name, takesValue, kind });

    if (letter !== undefined) {
        SHORT.set(letter, name);
    }
}

for (const { specs, ...traits } of GROUPS) {
    for (const spec of specs) {
        register(spec, traits);
    }
}

/** Every option the reader knows, by its long name without dashes. */
export const CURL_OPTIONS: ReadonlyMap<string, CurlOption> = OPTIONS;

/** Short letters to long names. */
export const CURL_SHORT_OPTIONS: ReadonlyMap<string, string> = SHORT;
