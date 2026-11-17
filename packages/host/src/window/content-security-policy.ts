/** Where the renderer is served from. Only development loosens anything. */
export type CspMode = 'development' | 'production';

type Directive = readonly [name: string, ...values: string[]];

// Every directive is written out even where `default-src` would already cover it. A fallback
// that is only implied widens in silence the day someone edits `default-src`.
const COMMON: readonly Directive[] = [
    ['default-src', "'self'"],
    ['script-src', "'self'"],
    ['img-src', "'self'", 'data:'],
    ['font-src', "'self'", 'data:'],
    ['worker-src', "'self'"],
    ['media-src', "'none'"],
    ['object-src', "'none'"],
    ['frame-src', "'none'"],
    ['frame-ancestors', "'none'"],
    ['base-uri', "'none'"],
    ['form-action', "'none'"],
];

// Vite injects its styles inline and talks to the renderer over its own websocket. Neither
// reaches a packaged build, so neither is written into the production policy. The nonce is
// left out here on purpose: a directive that carries one silences `'unsafe-inline'` for every
// browser that reads it, and Vite has no nonce to sign its styles with.
const DEVELOPMENT: readonly Directive[] = [
    ['style-src', "'self'", "'unsafe-inline'"],
    ['connect-src', "'self'", 'ws://localhost:*', 'http://localhost:*'],
];

/**
 * The renderer never opens a socket: main owns every connection and pushes the traffic back
 * over the bridge, so `connect-src` needs nothing past the app itself.
 *
 * The stylesheets are signed rather than opened. The editor builds its sheets at runtime, which
 * leaves three ways to let them through: a hash of something that does not exist yet, the nonce
 * of the run, or `'unsafe-inline'` — which would let through every other inline sheet the
 * window ever renders, including one written by a payload that arrives over the wire.
 *
 * Style attributes are the one thing opened. The editor positions every line it draws with a
 * `style` attribute in the markup it writes, and neither a nonce nor a hash can sign an
 * attribute. An attribute runs no code and `script-src` stays shut, so what this opens is how
 * an element looks, never what it does.
 */
function production(nonce: string): readonly Directive[] {
    return [
        ['style-src', "'self'", `'nonce-${nonce}'`],
        ['style-src-attr', "'unsafe-inline'"],
        ['connect-src', "'self'"],
    ];
}

/** What each mode adds to the directives every mode shares. */
const VARIABLE_OF_MODE: Readonly<Record<CspMode, (nonce: string) => readonly Directive[]>> = {
    development: () => DEVELOPMENT,
    production,
};

/** The policy the window answers with, as the header value. */
export function contentSecurityPolicy(mode: CspMode, nonce: string): string {
    const variable = VARIABLE_OF_MODE[mode](nonce);

    return [...COMMON, ...variable].map((directive) => directive.join(' ')).join('; ');
}
