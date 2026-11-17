import { globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const EXACT = /^(npm:(@[\w.-]+\/)?[\w.-]+@)?\d+\.\d+\.\d+(-[\w.-]+)?$/;

function declared(manifest) {
    return FIELDS.flatMap((field) => Object.entries(manifest[field] ?? {}));
}

/** What breaks the rule: a dependency with two versions, or one that names a range. */
function disagreements(manifests) {
    const versions = new Map();

    for (const [name, version] of manifests.flatMap(declared)) {
        versions.set(name, new Set(versions.get(name)).add(version));
    }

    return [...versions]
        .filter(([, each]) => each.size > 1 || [...each].some((one) => !EXACT.test(one)))
        .map(([name, each]) => `${name}: ${[...each].join(', ')}`);
}

function manifestsOfRepository() {
    return [
        'package.json',
        ...globSync(['apps/*/package.json', 'packages/*/package.json'], { cwd: ROOT }),
    ].map((file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8')));
}

describe('one version of each dependency across the repository', () => {
    it('names a dependency that two manifests declare with different versions', () => {
        const manifests = [
            { dependencies: { zod: '4.4.3' } },
            { devDependencies: { zod: '4.4.2' } },
        ];

        expect(disagreements(manifests)).toEqual(['zod: 4.4.3, 4.4.2']);
    });

    it('names a dependency declared with a range', () => {
        expect(disagreements([{ dependencies: { zod: '^4.4.3' } }])).toEqual(['zod: ^4.4.3']);
    });

    it('accepts an alias with an exact version', () => {
        const manifests = [{ dependencies: { old: 'npm:socket.io-client@2.5.0' } }];

        expect(disagreements(manifests)).toEqual([]);
    });

    it('holds for every manifest of this repository', () => {
        expect(disagreements(manifestsOfRepository())).toEqual([]);
    });
});
