// The boundaries of the scripts, apart from `.dependency-cruiser.cjs` so that file keeps its size.
// `never` is the helper that file builds its own rules with.

/** @param {(name: string, comment: string, from: string, to: string) => object} never */
module.exports = (never) => [
    never(
        'quickjs-lives-in-script',
        'The engine of scripts is QuickJS and only packages/script knows it: the rest talks to it through the worker.',
        '^(?!packages/script/)',
        'node_modules/(quickjs-emscripten-core|quickjs-emscripten|@jitl/quickjs[^/]*)(/|$)',
    ),
    never(
        'engine-loads-only-in-the-worker',
        'The engine runs inside the worker of scripts. Main that loads it would run the code of a user in its own thread.',
        '^(?!packages/script/|packages/host/src/script/serve-scripts[.]ts$|packages/host/src/testing/|packages/[^/]+/tests/|apps/[^/]+/tests/|tools/)',
        '^packages/script/src/engine/',
    ),
    never(
        'node-vm-is-no-sandbox',
        'node:vm shares the process and its own docs say it is no security boundary. Scripts run in QuickJS.',
        '^(packages|apps|tools)/',
        '^(node:)?vm$|node_modules/vm2(/|$)',
    ),
];
