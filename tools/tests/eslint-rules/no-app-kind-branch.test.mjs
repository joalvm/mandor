import { describe, it } from 'vitest';

import { noAppKindBranch } from '../../eslint-rules/no-app-kind-branch.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester();

describe('the app kind branch rule', () => {
    it('lets a shared package hold data per app and refuses a branch on which app it is', () => {
        ruleTester.run('no-app-kind-branch', noAppKindBranch, {
            valid: [
                {
                    code: "const roots = { async: 'mandor-async', sync: 'mandor-sync' };",
                    filename: 'packages/host/src/origin/default-repo-root.ts',
                },
                {
                    code: 'const folder = roots[kind];',
                    filename: 'packages/host/src/origin/default-repo-root.ts',
                },
                {
                    code: "if (kind === 'sync') { start(); }",
                    filename: 'apps/sync/src/main/start-sync.ts',
                },
                {
                    code: "if (mode === 'development') { open(); }",
                    filename: 'packages/host/src/window/create-window.ts',
                },
            ],
            invalid: [
                {
                    code: "const name = kind === 'sync' ? 'Mandor Request' : 'Mandor Realtime';",
                    filename: 'packages/host/src/menu/build-app-menu.ts',
                    errors: [{ messageId: 'appKindBranch' }],
                },
                {
                    code: "if ('async' !== workspace.kind) { hide(); }",
                    filename: 'packages/shell/src/sidebar/open-sections.ts',
                    errors: [{ messageId: 'appKindBranch' }],
                },
                {
                    code: "switch (kind) { case 'async': run(); break; default: stop(); }",
                    filename: 'packages/collections/src/lib/collection-kind.ts',
                    errors: [{ messageId: 'appKindBranch' }],
                },
            ],
        });
    });
});
