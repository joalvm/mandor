import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { packageRootOf } from './third-party.mjs';

const WORKSPACE = /^(?<dir>packages\/[^/]+)\//u;

function workspaceOf(id, root) {
    const path = id.replaceAll('\\', '/');
    const prefix = `${root.replaceAll('\\', '/')}/`;

    if (!path.startsWith(prefix)) {
        return undefined;
    }

    const match = WORKSPACE.exec(path.slice(prefix.length));

    return match === null ? undefined : `${prefix}${match.groups.dir}`;
}

/**
 * Notes, after a build, which packages its bundle holds: the third-party ones, read off the paths
 * of its modules, and the ones of the repo, whose manifests say what they need at run time (a
 * font or a stylesheet a package imports in CSS is no module of the bundle). One file per target,
 * which `write-notices.mjs` turns into the notices of the installer.
 *
 * @param {{ outDir: string; root: string; target: string }} options `root` is the repo
 */
export function bundledPackages({ outDir, root, target }) {
    return {
        name: 'mandor:bundled-packages',
        apply: 'build',
        generateBundle(_options, bundle) {
            const ids = Object.values(bundle).flatMap((output) =>
                output.type === 'chunk' ? output.moduleIds : [],
            );
            const known = (values) => [...new Set(values.filter(Boolean))].sort();
            const record = {
                packages: known(ids.map(packageRootOf)),
                workspaces: known(ids.map((id) => workspaceOf(id, root))),
            };

            mkdirSync(outDir, { recursive: true });
            writeFileSync(
                join(outDir, `bundled-${target}.json`),
                `${JSON.stringify(record, null, 4)}\n`,
                'utf8',
            );
        },
    };
}
