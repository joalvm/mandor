import { describe, it } from 'vitest';

import { noInlineNotice } from '../../eslint-rules/no-inline-notice.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

describe('the inline notice rule', () => {
    it('keeps live regions inside the primitives that own the channels', () => {
        ruleTester.run('no-inline-notice', noInlineNotice, {
            valid: [
                {
                    code: 'const empty = <div role="status">Nada aún</div>;',
                    filename: 'packages/ui/src/components/EmptyState.tsx',
                },
                {
                    code: 'const log = <div role="log">Actividad</div>;',
                    filename: 'packages/feature-connections/src/components/ActivityLog.tsx',
                },
                {
                    code: 'const image = <span role="img" aria-label="Entrante" />;',
                    filename: 'packages/feature-connections/src/components/ActivityRow.tsx',
                },
            ],
            invalid: [
                {
                    code: 'const banner = <div role="alert">Falló la conexión</div>;',
                    filename: 'packages/feature-connections/src/components/ConnectionPanel.tsx',
                    errors: [{ messageId: 'noticeRole' }],
                },
                {
                    code: 'const saved = <p role="status">Guardado</p>;',
                    filename: 'apps/async/src/App.tsx',
                    errors: [{ messageId: 'noticeRole' }],
                },
            ],
        });
    });
});
