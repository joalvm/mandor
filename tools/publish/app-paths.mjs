import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspacePackages } from '../workspace/workspace-packages.mjs';

/** The packages of the workspace an app names in its manifest, whatever the field. */
function namedBy(root, folder) {
    const manifest = JSON.parse(readFileSync(join(root, 'apps', folder, 'package.json'), 'utf8'));

    return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).filter((name) =>
        name.startsWith('@mandor/'),
    );
}

/**
 * The folders whose commits change what an app ships: its own, and every package it reaches
 * through the manifests. A commit that only touches the other app, or the tooling, leaves this
 * app as it was, so it neither moves its version nor shows in its notes.
 */
export function appPaths(root, folder) {
    const packages = new Map(workspacePackages(root).map((each) => [each.name, each]));
    const reached = new Set();
    const pending = namedBy(root, folder);

    while (pending.length > 0) {
        const name = pending.pop();
        const found = packages.get(name);

        if (found !== undefined && !reached.has(name)) {
            reached.add(name);
            pending.push(...found.internal);
        }
    }

    const dirs = [...reached].map((name) => `packages/${packages.get(name)?.dir ?? ''}`);

    return [`apps/${folder}`, ...dirs.sort()];
}
