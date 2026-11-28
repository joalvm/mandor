# Security

## Reporting a vulnerability

Please report it privately, not in a public issue: open the **Security** tab of this repository
and choose **Report a vulnerability**. Only the maintainer sees the report.

Useful to include:

- which app (Mandor Realtime or Mandor Request), its version and the operating system;
- what an attacker can do, and what they need first (a crafted file, a malicious server, local
  access);
- the steps to reproduce it, or a proof of concept.

You will get an answer within seven days. Once a fix is released, the advisory is published with
credit to you, unless you prefer otherwise.

## Supported versions

The latest release of each app, Mandor Request and Mandor Realtime, receives security fixes. An
older release does not: the fix arrives as a new one.

## Scope

Both apps run locally, without an account or a server of their own. Of particular interest:

- anything that lets a document, a collection or a server response run code or reach the
  filesystem;
- secrets leaving `safeStorage`, or being written to the user's files or logs;
- a transport reaching a URL scheme it should refuse.

## Scripts

Requests, folders, collections and connections can carry scripts. A script comes in with a shared
origin or an imported file, so its author may be a stranger. Two promises hold without exception:
a value marked secret in an environment variable never reaches a script nor leaves where a script
sent it, and no malicious code runs on the machine because of Mandor. How to write scripts and
what each one may do: [SCRIPTS.md](SCRIPTS.md).

### The model

- **A script nobody approved on this machine does not run.** Opening, importing or syncing never
  runs anything. An approval is bound to the exact text and to its origin, workspace, level and
  event, and lives in the data directory of the app, never in a repo: a committed `.mandor/`
  approves nothing. A text that changes on disk asks again.
- **Scripts run in QuickJS compiled to WebAssembly, on a worker thread of the main process.** The
  script produces no code for V8, sees no object of the host, and only JSON text crosses between
  them. Main checks every message of the worker, its size and its order, and ends the worker on
  any one out of contract. Time, memory, output, variables and network calls have limits main
  enforces.
- **Secrets marked in an environment never enter the engine.** A send whose destination a script
  moved goes without any secret; one a script influenced that a redirect takes to another site
  goes without its secret headers.

### What is left

- The worker has no sandbox of the operating system. Escaping it takes a bug in QuickJS **and** in
  the WebAssembly engine of V8 or the glue between them. Whoever manages it runs inside main: with
  the permissions of the user, and with the secrets of the session.
- A native crash of WebAssembly or V8 takes the app down: no separate process contains it.
- An approved script reaches the network with `sendRequest`, with the proxy and client
  certificates of the machine, `localhost` included. It can carry away variables not marked secret
  and the responses it gets. Approving proves who wrote the text on this machine, not that it is
  harmless; an HTTP request that left is not undone.
- Someone who can push to a shared origin can change the base URL of an environment without any
  script, and the secret then goes to that host, as in other API clients: the environment belongs
  to the user.

### The engine

| Package                                     | Version | Comes from                                                                                      |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `quickjs-emscripten-core`                   | 0.32.0  | npm, the TypeScript bindings of the quickjs-emscripten project                                  |
| `@jitl/quickjs-singlefile-cjs-release-sync` | 0.32.0  | npm, QuickJS compiled with Emscripten by the same project, release build, WebAssembly inside JS |

Both are pinned in `package-lock.json` with their integrity hash. Upgrading the engine goes through
`npm run deps:upgrade` and ships only once the corpus of the script API, the attack tests and the
memory tests of both apps pass on the new version.

If the engine has a flaw with no fix yet, the switch **Run scripts** in Settings → Scripts stops
every script in the app, without deleting or unapproving any, until a version with the fix is out.
