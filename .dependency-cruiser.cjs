// Package boundaries. Each rule is named after what it forbids and CONTRIBUTING.md lists the names;
// every boundary lives here, so it is refused by CI instead of by a reviewer's memory.
//
// Workspace imports (@mandor/x) resolve through the node_modules symlink back to
// packages/x/src, so paths below are the real ones inside the repository.

// The lists of packages come from their manifests, not from this file: a package that exists is
// in its class the day it is created, and one that does not exist is in none. The class is read
// off what the package needs, never off its name, so a package cannot sneak into one by being
// named a certain way. Node loads the module synchronously: it has no top-level await.
const CLASSES = require('./tools/workspace/workspace-packages.mjs').packageClasses(__dirname);
const FEATURES = `(${CLASSES.features.join('|')})`;

/**
 * What ui cannot know: the core, save validate. validate reads a JSON Schema and checks a value,
 * with no entity of the domain in it, and the editor of ui is what asks it.
 */
const DOMAIN = CLASSES.pure.filter((dir) => dir !== 'validate').join('|');

/**
 * A boundary CI refuses: nothing under `from` imports anything under `to`. A `to` that is a string
 * is a path; one that is an object says more of the import (a dynamic one, a type-only one).
 */
function never(name, comment, from, to) {
    const target = typeof to === 'string' ? { path: to } : to;

    return { name, severity: 'error', comment, from: { path: from }, to: target };
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            comment: 'A cycle means the two files are one module that was split by accident.',
            from: {},
            to: { circular: true },
        },
        {
            name: 'no-orphans',
            severity: 'error',
            comment: 'Nothing imports this file. Either wire it up or delete it.',
            from: {
                orphan: true,
                pathNot: [
                    '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$',
                    '\\.d\\.(mts|ts)$',
                    '(^|/)(index)\\.ts$',
                    '(^|/)(eslint|vitest|turbo|prettier)[^/]*\\.(js|cjs|mjs|ts)$',
                    '^tools/',
                    // What an npm override puts in place of a package: only node_modules reaches it.
                    '^packages/[^/]+/vendor/',
                ],
            },
            to: {},
        },
        never(
            'schema-depends-on-nothing',
            'schema is the root of the domain. It cannot import another package.',
            '^packages/schema/',
            '^packages/(?!schema/)',
        ),
        never(
            'ipc-is-types-only',
            'ipc carries the contract: schema and interop-core only.',
            '^packages/ipc/',
            '^packages/(?!ipc/|schema/|interop-core/)',
        ),
        never(
            'ui-knows-no-domain',
            'ui takes props, never entities. Domain in ui means a prop is missing.',
            '^packages/ui/',
            `^packages/(${DOMAIN}|host|${FEATURES})/`,
        ),
        // npm dependencies cruise by resolved path, so the name matches under node_modules.
        never(
            'pure-packages-have-no-runtime-host',
            'Node-only packages stay testable without React or Electron.',
            `^packages/(${CLASSES.pure.join('|')})/`,
            'node_modules/(react|react-dom|electron)(/|$)',
        ),
        never(
            'store-fs-does-not-run-git',
            'Disk layout and version control are separate capabilities.',
            '^packages/store-fs/',
            '^packages/git/',
        ),
        never(
            'merge-touches-neither-git-nor-disk',
            'merge is a pure function of three texts. That is what makes it testable.',
            '^packages/merge/',
            '^packages/(git|store-fs)/',
        ),
        never(
            'vars-imports-only-schema',
            'vars interpolates against the domain and nothing else; disk stays in store-fs.',
            '^packages/vars/',
            '^packages/(?!vars/|schema/)',
        ),
        never(
            'validate-imports-only-itself',
            'validate wraps the schema checker and sees no domain: no collection, no connection, no event.',
            '^packages/validate/',
            '^packages/(?!validate/)',
        ),
        never(
            'interop-imports-only-schema-and-itself',
            'interop builds the pipeline: core and schema, nothing else. Its conformance tests read what it writes with validate.',
            '^packages/(interop-[^/]+)/(?!tests/conformance/)',
            '^packages/(?!$1/|schema/|interop-core/)',
        ),
        never(
            'codicons-only-in-icons',
            'Codicons is the pinned source of icon geometry: only packages/icons reads it, at build time.',
            '^(?!packages/icons/)',
            'node_modules/@vscode/codicons',
        ),
        never(
            'transport-stays-a-leaf',
            'transport-* moves bytes and nothing else: no React, no Electron, no other package of the monorepo.',
            '^packages/(transport-[^/]+)/',
            '^packages/(?!$1/)',
        ),
        ...require('./tools/workspace/codegen-boundaries.cjs')(never),
        ...require('./tools/workspace/format-boundaries.cjs')(never),
        ...require('./tools/workspace/yaml-boundaries.cjs')(never),
        ...require('./tools/workspace/script-boundaries.cjs')(never),
        never(
            'in-process-worker-only-in-tests',
            'The worker of scripts with no thread runs the engine in the thread that loads it: only a test may.',
            '^(packages|apps)/[^/]+/src/(?!testing/in-process-script-worker[.]ts$)',
            '^packages/host/src/testing/in-process-script-worker[.]ts$',
        ),
        never(
            'features-do-not-import-features',
            'Two features talk through the store or a shell registry, never directly.',
            `^packages/${FEATURES}/`,
            `^packages/(?!$1/)${FEATURES}/`,
        ),
        never(
            'shell-knows-no-feature-and-no-host',
            'shell renders what the tab registry gives it. Knowing a feature breaks that.',
            '^packages/shell/',
            `^packages/(host|${FEATURES})/`,
        ),
        never(
            'host-has-no-renderer',
            'The main process cannot import renderer code, not even for a type.',
            '^packages/host/',
            `^packages/(ui|shell|${FEATURES})/`,
        ),
        never(
            'host-names-no-format',
            'host imports and exports whatever format the app lists; naming one is choosing for both apps.',
            '^packages/host/',
            '^packages/interop-(?!core/)',
        ),
        never(
            'no-app-type-choice-outside-apps',
            'apps/* is the only place that picks async or sync.',
            '^packages/(?!transport-)',
            '^packages/(transport-[^/]+)/',
        ),
        never(
            'the-two-apps-ignore-each-other',
            'One app reaching into the other makes the two a single one. What both need goes up to packages/.',
            '^apps/([^/]+)/',
            '^apps/(?!$1/)',
        ),
    ],
    options: {
        doNotFollow: { path: 'node_modules' },
        // Build output of the repo, not the `dist/` a package of npm ships: a boundary on a library must see it.
        exclude: {
            path: '^(packages|apps|tools)/.*/(dist|out|coverage|release|\\.turbo)/|^(dist|out|coverage|release|\\.turbo)/',
        },
        tsPreCompilationDeps: true,
        tsConfig: { fileName: 'tsconfig.base.json' },
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'default'],
        },
        reporterOptions: { text: { highlightFocused: true } },
    },
};
