import { describe, it } from 'vitest';

import { dialogNeedsPolicy } from '../../eslint-rules/dialog-needs-policy.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

describe('the dialog policy rule', () => {
    it('requires the reason for a modal right above its use', () => {
        ruleTester.run('dialog-needs-policy', dialogNeedsPolicy, {
            valid: [
                {
                    code: [
                        "import { ConfirmDialog } from '@mandor/ui';",
                        '// modal-policy: irreversible-confirmation',
                        'const dialog = <ConfirmDialog />;',
                    ].join('\n'),
                    filename: 'apps/async/src/renderer/ConnectionRow.tsx',
                },
                {
                    code: [
                        "import { Dialog as SystemDialog } from '@mandor/ui';",
                        '// modal-policy: system-dialog',
                        'const dialog = <SystemDialog />;',
                    ].join('\n'),
                    filename: 'packages/repos/src/components/OriginPicker.tsx',
                },
                {
                    code: [
                        "import { Dialog } from '@mandor/ui';",
                        'const dialog = (',
                        '    <>',
                        '        {/* modal-policy: security-decision */}',
                        '        <Dialog />',
                        '    </>',
                        ');',
                    ].join('\n'),
                    filename: 'apps/async/src/renderer/SecurityNotice.tsx',
                },
                {
                    code: [
                        "import { Dialog } from '@mandor/ui';",
                        '// modal-policy: short-config-form',
                        'const dialog = <Dialog />;',
                    ].join('\n'),
                    filename: 'packages/env/src/components/EnvironmentsDialog.tsx',
                },
                {
                    code: "import { ConfirmDialog } from '@mandor/ui';\nconst test = <ConfirmDialog />;",
                    filename: 'packages/repos/tests/EmptyOriginDialog.test.tsx',
                },
            ],
            invalid: [
                {
                    code: "import { SaveChangesDialog } from '@mandor/ui';\nconst dialog = <SaveChangesDialog />;",
                    filename: 'packages/shell/src/components/overlay/UnsavedChangesDialog.tsx',
                    errors: [{ messageId: 'missingPolicy' }],
                },
                {
                    code: "import { Dialog } from '@mandor/ui';\nconst dialog = <Dialog />;",
                    filename: 'apps/async/src/renderer/ConnectionPanel.tsx',
                    errors: [{ line: 2, messageId: 'missingPolicy' }],
                },
                {
                    code: [
                        "import { ConfirmDialog } from '@mandor/ui';",
                        '// modal-policy: security-decision',
                        '',
                        'const dialog = <ConfirmDialog />;',
                    ].join('\n'),
                    filename: 'packages/repos/src/components/OriginPanel.tsx',
                    errors: [{ messageId: 'missingPolicy' }],
                },
            ],
        });
    });
});
