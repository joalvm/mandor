import { describe, it } from 'vitest';

import { noNativeControl } from '../../eslint-rules/no-native-control.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

describe('the native control rule', () => {
    it('keeps native form controls inside the primitives', () => {
        ruleTester.run('no-native-control', noNativeControl, {
            valid: [
                {
                    code: 'const field = <input type="text" />;',
                    filename: 'packages/ui/src/components/Input.tsx',
                },
                {
                    code: "import { Input } from '@mandor/ui';",
                    filename: 'packages/feature-connections/src/components/ConnectionPanel.tsx',
                },
                {
                    code: 'const action = <button type="button">Conectar</button>;',
                    filename: 'packages/ui/src/components/button/Button.tsx',
                },
                {
                    code: 'const action = <button type="button">Conectar</button>;',
                    filename: 'apps/async/tests/unit-dom/panel.test.tsx',
                },
            ],
            invalid: [
                {
                    code: 'const field = <input type="text" />;',
                    filename: 'packages/feature-connections/src/components/ConnectionPanel.tsx',
                    errors: [{ messageId: 'nativeControl' }],
                },
                {
                    code: 'const choice = <select><option>ws</option></select>;',
                    filename: 'apps/async/src/App.tsx',
                    errors: [{ messageId: 'nativeControl' }, { messageId: 'nativeControl' }],
                },
                {
                    code: 'const body = <textarea />;',
                    filename: 'packages/shell/src/components/Layout.tsx',
                    errors: [{ messageId: 'nativeControl' }],
                },
                {
                    code: 'const action = <button type="button">Conectar</button>;',
                    filename: 'apps/async/src/App.tsx',
                    errors: [{ messageId: 'nativeControl' }],
                },
            ],
        });
    });
});
