import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const turbo = parse(readFileSync(join(ROOT, 'turbo.json'), 'utf8'));

function packagedOutput(app) {
    const builder = parseYaml(
        readFileSync(join(ROOT, 'apps', app, 'electron-builder.yml'), 'utf8'),
    );

    return builder.directories.output;
}

describe('what turbo keeps of a build', () => {
    /**
     * The cache stores every output of every hash it ever saw, and nothing ever trims it. The
     * packaged app is close to a gigabyte, and each change of a source made a new one: the
     * folder reached two hundred gigabytes. A build keeps what electron-vite writes, and only that.
     */
    it('keeps the bundles of a build and never the packaged app', () => {
        expect(turbo.tasks.build.outputs).toEqual(['out/**']);

        for (const app of ['async', 'sync']) {
            const packaged = packagedOutput(app);

            expect(packaged).not.toBe('out');
            expect(turbo.tasks.build.outputs.some((glob) => glob.startsWith(`${packaged}/`))).toBe(
                false,
            );
        }
    });

    /** A task that writes nothing has nothing to restore, and its entry would only take room. */
    it('has no task that keeps an entry with nothing in it', () => {
        for (const [name, task] of Object.entries(turbo.tasks)) {
            expect({ name, outputs: task.outputs ?? null }).not.toEqual({ name, outputs: [] });
        }
    });
});

describe('how turbo runs a build', () => {
    /**
     * Each renderer bundles Mermaid already built, and the two apps built side by side ran out of
     * the memory a hosted runner has. On its two cores, building one after the other costs nothing.
     */
    it('builds one app at a time', () => {
        expect(turbo.concurrency).toBe('1');
    });
});
