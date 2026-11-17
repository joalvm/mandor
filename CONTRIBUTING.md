# Contributing

Thanks for looking. This file covers how the code is laid out, which gates a change has to pass
and the rules those gates hold. Everything here is checked by a machine: if it is written down,
CI refuses what breaks it.

## Before your first pull request

- The code is licensed under the [GNU Affero General Public License v3.0 only](LICENSE), and so
  is what you contribute.
- Contributions need the [Contributor License Agreement](CLA.md), signed once: the CLA Assistant
  bot asks on your first pull request. You keep the copyright of your work; the agreement lets the
  project relicense it in the future.
- The names and logos are not covered by the code license: see [TRADEMARKS.md](TRADEMARKS.md).
- Vulnerabilities are reported privately, as [SECURITY.md](SECURITY.md) describes, never in an
  issue.
- Everyone follows the [code of conduct](CODE_OF_CONDUCT.md).

## Getting started

Node 26 or newer, npm 11 or newer, and Docker with a Linux engine for the gates. Line endings are
LF; versions in every `package.json` are exact.

```bash
npm ci --foreground-scripts
```

```bash
npm run dev:async
```

```bash
npm run dev:sync
```

`--foreground-scripts` matters: without it the two apps download Electron at the same time and
collide. Coding agents: `npm run skills:link` links the standards in [`skills/`](skills/README.md)
for Claude Code and Codex.

## Gates

Tests and gates run in Docker, never on the host. Each `ci:*` builds an image from the working
tree, uncommitted changes included.

| Gate              | Command                       | When                                           |
| ----------------- | ----------------------------- | ---------------------------------------------- |
| tests of a file   | `npm run ci:test -- <paths>`  | red and green of each change                   |
| check             | `npm run ci:check -- <paths>` | after a coherent block of edits                |
| verify            | `npm run ci:verify`           | before asking for review                       |
| full rehearsal    | `npm run ci:local`            | QA, verify and the end-to-end of both apps     |
| installers        | `npm run ci:installers`       | changes to packaging                           |
| generated sources | `i18n` · `tokens` · `icons`   | after changing their source; commit the output |

- `ci:check` formats a throwaway copy: run `npx prettier --write <paths>` on the host first.
- `verify` = format → generated sources up to date → design → guards → plans → lint →
  dependency boundaries → unused code and dependencies → duplicated code → types → tests → build.
  Tests run DOM and runtime integration projects without coverage, then the pure packages' own
  tests with V8 coverage and the same package thresholds. Runtime integration tests cannot supply
  coverage missing from a pure package. `npm run test:node` still runs every Node project on Windows.
- Touching a `package.json` or the lockfile reinstalls inside the image: minutes. Group edits.
- Pull requests to `main` run the same gates in GitHub Actions, with end-to-end on Linux and
  Windows, and macOS when the change touches the system layer.
  Linux runs `verify:checks` beside `verify:tests-build` on separate runners. The protected
  `verify (ubuntu-latest)` check succeeds only when both jobs succeed; failure, cancellation or
  skipping keeps it red. Windows verification and all end-to-end jobs wait for that aggregate;
  end-to-end jobs reuse the Linux build. Local `verify` keeps the complete gate in order on one
  machine.
  Windows end-to-end runs each app on its own runner, keeping focus and clipboard independent;
  the protected `e2e (windows-latest)` check requires success from both. Linux and macOS run both
  apps in order through the same action.
  A commit that only touches e2e tests does not repeat the Windows and macOS checks an earlier
  commit of the pull request left green; Linux always runs. To repeat a check with no new commit,
  `gh run rerun <run> --failed` runs only what failed.

## Layout

Two Electron apps, one codebase. `apps/async` speaks realtime protocols (WebSocket, Socket.IO,
AsyncAPI); `apps/sync` speaks request and response (HTTP, GraphQL, OpenAPI, Postman, HAR, curl).
They never import each other.

A package's layer comes from its dependencies: with `react` it is **dom**, with `electron` it is
**platform**, with neither it is **pure**.

```
pure       schema  store-fs  git  vars  validate  ipc
           interop-core  interop-formats  transport-async  transport-sync  graphql  codegen  merge  script
platform   host
dom        i18n  icons  ui                   primitives: strings, glyphs, controls, theme
           shell                             chrome: grid, tabs, sidebar, palette, session
           collections  docs  env  exchange  prefs  repos  updates  workspace    features both apps mount
apps/      async  sync
```

A package is `package.json` (`@mandor/<name>`, `exports` to `./src/index.ts`), `src/index.ts` as
its only barrel, and `tests/` mirroring `src/`. What both apps use is registered in both apps in
the same pull request. An `if` on the kind of app inside `packages/` is a boundary in the wrong
place: that code belongs in `apps/<app>/src/renderer/features/`.

In an app's `package.json`, `dependencies` lists only what main loads from `node_modules` at run
time, which is all the installer carries. Everything the bundles already hold, the `@mandor/*`
packages included, goes under `devDependencies`.

Every dependency has one exact version across all the manifests; a test fails otherwise.
`npm run deps:upgrade` moves them together to the latest stable release that has been out for three
days, installs and runs `npm audit`; `.ncurc.cjs` says what it holds back and why. `npm audit` must
stay at zero. `packages/transport-async/vendor/parseuri` replaces, through an override, a parser of
the Socket.IO v2 client with no fix in its own shape.

## Boundaries

`npm run depcruise` enforces them; each rule in `.dependency-cruiser.cjs` is named after what it
forbids. `no-circular` and `no-orphans` are errors: every new file outside `tools/` is imported
by something.

`schema-depends-on-nothing` · `ipc-is-types-only` · `ui-knows-no-domain` ·
`pure-packages-have-no-runtime-host` · `store-fs-does-not-run-git` ·
`merge-touches-neither-git-nor-disk` · `vars-imports-only-schema` · `validate-imports-only-itself`
· `interop-imports-only-schema-and-itself` · `formats-do-not-import-formats` ·
`a-format-library-stays-in-its-format` · `listing-a-format-loads-no-parser` · `transport-stays-a-leaf` ·
`features-do-not-import-features` · `shell-knows-no-feature-and-no-host` · `host-has-no-renderer`
· `host-names-no-format` · `no-app-type-choice-outside-apps` · `the-two-apps-ignore-each-other` ·
`js-yaml-drops-comments` · `quickjs-lives-in-script` · `engine-loads-only-in-the-worker` ·
`node-vm-is-no-sandbox`.

## Lint

Core: `max-lines` 200 (code only; 250 in tests), `curly` on every block, `no-else-return`, `no-nested-ternary`,
`max-depth` 2, `complexity` 10, `max-statements` 20, `max-params` 4, `one-var: never`, one import
per module with its types inline (`no-duplicate-imports`), `import type` for a line that
only names types (`no-import-type-side-effects`), blank lines
between blocks, no `export default`, no type holding a function that returns `ReactNode` or
`ReactElement` (what is drawn is a child in the tree), and a function of the module declared with
`function`, not as a `const` arrow. Prettier wraps at 100. The rules of hooks
(`eslint-plugin-react-hooks`, recommended set, `exhaustive-deps` as an error) apply to `src/`:
nothing read from a ref or the clock while drawing, no state set the moment an effect runs.

Project rules (`tools/eslint-rules/`; the ones about file shape apply to `src/` only):

| Rule                                     | Requires                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `mandor/one-error-per-file`              | one error class, alone in its file                                            |
| `mandor/no-inner-barrel`                 | re-exports only from `src/index.ts` or a feature                              |
| `mandor/no-vague-file-name`              | no `utils`, `types`, `errors`, `helpers`                                      |
| `mandor/no-role-directory`               | no `src/errors/`, `src/constants/`, `src/schemas/`                            |
| `mandor/require-component-identity`      | `data-part` on the root of every component                                    |
| `mandor/no-component-prop`               | no component or glyph travels through props                                   |
| `mandor/no-component-ternary`            | a conditional piece is drawn by a component of its own, never by `?:` or `&&` |
| `mandor/component-file-holds-components` | hooks and functions go to files of their own; classes, tables and props stay  |
| `mandor/no-loose-component`              | nothing loose in `components/`: one folder per zone                           |
| `mandor/props-type-name`                 | props named `<Component>Props`                                                |
| `mandor/no-native-control`               | `button`, `input`, `select` only in `@mandor/ui`                              |
| `mandor/no-vendor-primitive`             | `radix-ui` only in `@mandor/ui`                                               |
| `mandor/no-foreign-icon-source`          | glyphs only from `@mandor/icons`; brand marks beside their app                |
| `mandor/no-inline-notice`                | notices by toast, notice centre or activity log, never inline in a panel      |
| `mandor/dialog-needs-policy`             | every modal states `// modal-policy:` with one of 4 reasons                   |
| `mandor/no-app-kind-branch`              | a package never compares with `'async'` or `'sync'`                           |
| `mandor/no-kind-branch`                  | what differs by kind comes from a typed table, not `switch` or `if` runs      |
| `mandor/hook-file-name`                  | the file that exports a hook is named after the hook                          |
| `mandor/no-pending-work-comment`         | no `TODO`, `FIXME`, `XXX` or `HACK` in a comment                              |

## Tests

| Kind      | Where                                    | Environment                          |
| --------- | ---------------------------------------- | ------------------------------------ |
| unit-node | `packages/*/tests/`                      | node, `.test.ts`                     |
| unit-dom  | `packages/{ui,shell,<feature>}/tests/`   | jsdom                                |
| app       | `apps/<app>/tests/unit-{node,dom}/`      | node or jsdom                        |
| fs        | `packages/store-fs/tests/`               | node, real temporary disk            |
| git       | `packages/git/tests/`                    | node, remote = local bare repository |
| e2e       | `apps/{async,sync}/tests/e2e/`           | Playwright + `_electron`             |
| types     | `{packages,apps}/*/tests/**/*.test-d.ts` | `tsc` only                           |

- A test outside these paths does not run, and a file shaped like a test that no runner picks up
  fails the guards.
- `.only` fails. A skipped test needs `// skip-policy: <reason>`; a wait on the clock needs
  `// timing-policy: <reason>`. Wait for a condition instead.
- Every test reaches an assertion. Anything written to `console.error` or `console.warn` fails it.
  In an e2e, the same goes for the console of a window, and for what it throws with nobody to
  catch it: the close of the app fails the test on it.
- Pure packages are covered at 100 %, measured by the node tests alone.
- Every new `.ts`/`.tsx` under `packages/*/src` or `apps/*/src` is named by a test of its package.

## Interface and design

- Interface strings live in `packages/i18n/src/lang/`, in English and Spanish. None of them uses
  version-control vocabulary or contains an absolute path: a test checks it.
- Tokens live in `packages/ui/src/styles/`; `scales.css` is the source of every height. Glyphs
  live in `packages/icons/src/glyph/`. The accent colour is for focus, selection, active and
  primary only.
- `npm run design` checks markup and tokens; exceptions carry `// band-policy:` or
  `// markup-policy:` with the reason.
- The design standard is the `ui-design` skill. Its project hooks: the focus rule lives once in
  `packages/ui/src/styles/focus.css` and reaches a control through `data-focus-frame` (it has a
  line of its own) or `data-focus-ring` (it has none); a glyph of work in progress turns under
  `data-spin`; every list of pairs is `KeyValueTable` from `@mandor/env`.

## Security

Windows run with `contextIsolation`, `sandbox` and no `nodeIntegration`, under a strict CSP. The
preload is typed and both edges of IPC are validated with zod. Secrets go to Electron's
`safeStorage` and never into the user's files. Each realtime transport accepts only its own URL
schemes, checked in the main process. No code path force-pushes.

## Branches, commits and pull requests

- Branch from `main` as `type/short-description`. One branch, one change, one pull request.
- Titles follow `type(scope): description`, at most 120 characters. Types: `feat`, `fix`,
  `refactor`, `test`, `docs`, `build`, `chore`.
- No `Co-Authored-By` trailers: the QA gate rejects them.
- Pull requests are squashed. Six checks must be green; history on `main` is linear.
