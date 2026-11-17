/**
 * Every module of the host and of the apps that writes something out of this process, listed
 * by hand. The guard beside this file reads it: a module that reaches a sink and is not here
 * fails the build, so the next border —the output of MCP— cannot arrive without someone
 * deciding, in writing, whether a secret can travel through it.
 *
 * The list lives in `tools/` and not in `packages/vars`: a pure package that carried paths of
 * `host` and of `apps` would be the dependency the other way round, and a file nobody imports
 * from `src`, which is what `no-orphans` marks in red.
 */

/**
 * Borders that carry text of the session: each one is the last hand the text passes through
 * before it is out. The guard checks that each one reaches the redaction.
 *
 * The fourth path of the four —the answer of a channel— has no line of its own here: it does
 * not write, it returns, and it is wrapped once for every handler, the app's own included, in `register-handlers.ts`.
 * The snippets of Sync leave by this path: `codegen.handlers.ts` redacts before the library
 * encodes, and the wrapping redacts again. The guard checks that wrapping on its own.
 */
export const REDACTED_EDGES = {
    'packages/host/src/ipc/push-to-window.ts': 'everything main pushes to the window',
    'packages/host/src/log/create-logger.ts': 'the log file of the host',
    'packages/host/src/export/export.handlers.ts': 'the exported file, where the user chose',
    'apps/async/src/main/record/activity-recorder.ts':
        'the recording of a connection, one line per frame',
    'apps/async/src/main/export/jsonl.handlers.ts':
        'the exported activity of a connection, where the user chose',
};

/**
 * Modules that reach a sink and carry no text of the session. Each one says why: a list of
 * exceptions without reasons grows by habit, and this one is read by whoever adds the next.
 */
export const NOT_A_TEXT_BORDER = {
    'packages/host/src/doc/doc.handlers.ts':
        'the docs the user writes by hand, which they put in the workspace to be committed',
    'packages/host/src/import/write-doc-entry.ts':
        'the notes of a folder the user chose to import, as they wrote them, which go to the workspace to be committed',
    'packages/host/src/repo/guarded-write.ts':
        'the merge of texts the repo already holds, items and docs of the user, which go to git as they are',
    'packages/host/src/sync/merge-divergence.ts':
        'the provisional merge of texts the repo already holds, items and docs of the user, which go to git as they are',
    'packages/host/src/conflict/resolve-conflict.ts':
        'the answers of a person over texts the repo already holds, items and docs of the user, which go to git as they are',
    'packages/host/src/origin/origins.ts': 'the origins of the user: names, urls and paths',
    'packages/host/src/origin/secret-store.ts': 'the ciphertext of a secret, which is the point',
    'packages/host/src/auth/oauth/token-cache.ts': 'the ciphertext of a token, never the token',
    'packages/host/src/secret/secret-index.ts': 'the names that have a value, never a value',
    'packages/host/src/network/network-store.ts':
        'the network settings of this machine: a proxy address, a user name and certificate paths; the password and the passphrases stay in the keychain',
    'packages/host/src/script/approved-scripts.ts':
        'the sha256 of the scripts this machine approved, one hash per line, never a text',
    'packages/host/src/script/scripts-switch.ts':
        'the switch that turns the scripts off, a boolean of this machine',
    'packages/host/src/runtime/start-host.ts': 'hands ipcMain to the registration that wraps it',
    'packages/host/src/dialogs/last-directory.ts':
        'the folder the last dialog of the system was left in, a path of this machine',
    'apps/sync/src/main/request/disk-body-spill.ts':
        'the bytes of a response as they arrived, in `.mandor/bodies`, which is never committed: a text read from there is redacted on its way out, and a binary body cannot carry a marker',
    'apps/sync/src/main/history/history-writer.ts':
        'the history of sends, one file per send, in `.mandor/history`, which is never committed',
    'apps/sync/src/main/cookies/cookie-jar-store.ts':
        'the cookies a server set, in `.mandor/cookies`, which is never committed: a marker inside a value would break the session it keeps',
    'apps/sync/src/main/graphql/schema-cache.ts':
        'the schema a server published, never text the user wrote',
    'apps/sync/src/main/request/save-body.ts':
        'the body of a response the user chose to save, as it arrived: it may be a file, and a marker inside would corrupt it',
};
