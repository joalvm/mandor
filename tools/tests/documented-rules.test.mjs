import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** A rule is active when the config turns it on, alone or with its options. */
const ACTIVE = /'mandor\/([a-z-]+)':\s*\[?\s*'(?:error|warn)'/g;

async function textOf(path) {
    return readFile(join(ROOT, path), 'utf8');
}

/**
 * A rule the contributor does not know about is a rule they meet as a red lint, with no reason
 * attached. The table drifted to six rules out of thirteen before anybody noticed, so the table
 * in `CONTRIBUTING.md` is now read against the config that turns the rules on.
 */
describe('the mandor lint rules', () => {
    it('are all written down in CONTRIBUTING.md', async () => {
        const config = await textOf('eslint.config.js');
        const contributing = await textOf('CONTRIBUTING.md');
        const active = [...new Set([...config.matchAll(ACTIVE)].map(([, rule]) => rule))];

        expect(active.length).toBeGreaterThan(0);
        expect(active.filter((rule) => !contributing.includes(`\`mandor/${rule}\``))).toEqual([]);
    });
});
