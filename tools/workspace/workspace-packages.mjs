import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {'dom' | 'platform' | 'pure'} PackageLayer
 * @typedef {{ name: string; dir: string; internal: string[]; layer: PackageLayer }} WorkspacePackage
 */

/** Every dependency a manifest names, whatever the field: a type-only `electron` still ties it. */
function dependencyNames(manifest) {
    return Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
    });
}

function manifestOf(dir) {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

/**
 * The layer is read off what a package needs, not off a list: `react` draws, so it runs in the
 * dom; `electron` is the platform; the rest touches neither and is the pure core.
 *
 * @param {string[]} names
 * @returns {PackageLayer}
 */
function layerOf(names) {
    if (names.includes('react')) {
        return 'dom';
    }

    if (names.includes('electron')) {
        return 'platform';
    }

    return 'pure';
}

/**
 * The packages of the workspace, read from `packages/<dir>/package.json`. It is the one list of
 * packages the tooling has: the test projects, the coverage gates and the frontier all ask here,
 * so a new package is picked up by every one of them the day its manifest exists.
 *
 * @param {string} root the root of the repository
 * @returns {WorkspacePackage[]}
 */
export function workspacePackages(root) {
    const packagesDir = join(root, 'packages');

    return readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((dir) => existsSync(join(packagesDir, dir, 'package.json')))
        .sort()
        .map((dir) => {
            const manifest = manifestOf(join(packagesDir, dir));
            const names = dependencyNames(manifest);

            return {
                name: manifest.name,
                dir,
                internal: names.filter((name) => name.startsWith('@mandor/')),
                layer: layerOf(names),
            };
        });
}

/**
 * The two classes the frontier writes rules for: the pure core, and the feature packages, which
 * are the dom packages that mount in the chrome and so depend on shell.
 *
 * @param {string} root the root of the repository
 * @returns {{ features: string[]; pure: string[] }} folder names under `packages/`
 */
export function packageClasses(root) {
    const packages = workspacePackages(root);
    const dirsOf = (keep) => packages.filter(keep).map((each) => each.dir);

    return {
        features: dirsOf((each) => each.layer === 'dom' && each.internal.includes('@mandor/shell')),
        pure: dirsOf((each) => each.layer === 'pure'),
    };
}
