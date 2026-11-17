// The boundaries of codegen, apart from `.dependency-cruiser.cjs` so that file keeps its size.
// `never` is the helper that file builds its own rules with.

/** @param {(name: string, comment: string, from: string, to: string) => object} never */
module.exports = (never) => [
    never(
        'codegen-imports-only-schema-and-vars',
        'codegen turns requests into text and text into requests: schema and vars, nothing else.',
        '^packages/codegen/',
        '^packages/(?!codegen/|schema/|vars/)',
    ),
    never(
        'codegen-runs-in-main',
        'The snippet library needs Node: codegen is reached through a channel, never from a window.',
        '^apps/[^/]+/src/(renderer|preload)/',
        '^packages/codegen/',
    ),
];
