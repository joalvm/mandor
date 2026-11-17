import { describe, it } from 'vitest';

import { noRoleDirectory } from '../../eslint-rules/no-role-directory.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester();

describe('the role directory rule', () => {
    it('refuses a folder that groups by technical role and accepts one that groups by entity', () => {
        ruleTester.run('no-role-directory', noRoleDirectory, {
            valid: [
                { code: 'const a = 1;', filename: 'packages/schema/src/repo/parse-repo.ts' },
                { code: 'const a = 1;', filename: 'packages/schema/src/fields/slug-schema.ts' },
                { code: 'const a = 1;', filename: 'packages/ipc/src/testing/fake-bridge.ts' },
                { code: 'const a = 1;', filename: 'packages/shell/src/components/Tab.tsx' },
                { code: 'const a = 1;', filename: 'packages/shell/src/hooks/useTab.ts' },
                { code: 'const a = 1;', filename: 'packages/shell/src/lib/state-label.ts' },
                { code: 'const a = 1;', filename: 'packages/host/src/index.ts' },
            ],
            invalid: [
                {
                    code: 'const a = 1;',
                    filename: 'packages/schema/src/errors/format-error.ts',
                    errors: [{ messageId: 'role' }],
                },
                {
                    code: 'const a = 1;',
                    filename: 'packages/ipc/src/payload/ws-open.ts',
                    errors: [{ messageId: 'role' }],
                },
                {
                    code: 'const a = 1;',
                    filename: 'packages/schema/src/repo/constants/limits.ts',
                    errors: [{ messageId: 'role' }],
                },
                {
                    // ESLint hands the rule the path of the machine it runs on, and on Windows
                    // that path is spelled with backslashes.
                    code: 'const a = 1;',
                    filename: 'C:\\repo\\packages\\schema\\src\\errors\\format-error.ts',
                    errors: [{ messageId: 'role' }],
                },
            ],
        });
    });
});
