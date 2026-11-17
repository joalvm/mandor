import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const ERROR = 2;

const SOURCE = join(ROOT, 'packages/ui/src/components/button/Button.tsx');

/**
 * eslint-config-prettier closes the config and switches off every rule that can touch layout,
 * including the ones the house config asks for with options Prettier never fights. A rule it
 * resets still reads as `'error'` in the config, so only the resolved config tells the truth.
 */
describe('the rules Prettier does not own', () => {
    it.each(['curly', '@stylistic/max-len'])(
        'keep %s on after the Prettier reset',
        async (rule) => {
            const config = await new ESLint({ cwd: ROOT }).calculateConfigForFile(SOURCE);

            expect(config.rules[rule][0]).toBe(ERROR);
        },
    );
});
