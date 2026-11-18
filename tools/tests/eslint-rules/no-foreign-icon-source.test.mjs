import { describe, it } from 'vitest';

import { noForeignIconSource } from '../../eslint-rules/no-foreign-icon-source.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

describe('the foreign icon source rule', () => {
    it('keeps every authored glyph inside the icons package', () => {
        ruleTester.run('no-foreign-icon-source', noForeignIconSource, {
            valid: [
                {
                    code: 'const glyph = <svg><path /></svg>;',
                    filename: 'packages/icons/src/add.tsx',
                },
                {
                    code: "import source from './glyph/add.svg';",
                    filename: 'packages/icons/tools/build-icons.mjs',
                },
                {
                    code: "import { Icon } from '@mandor/icons';",
                    filename: 'packages/ui/src/components/Button.tsx',
                },
                {
                    code: "import { optimize } from 'svgo';",
                    filename: 'packages/icons/tools/normalize-icon-svg.mjs',
                },
                {
                    code: "import geometry from '@vscode/codicons/src/icons/add.svg';",
                    filename: 'packages/icons/src/frame.tsx',
                },
                {
                    code: 'const name = entry.icon; const glyph = <Icon name={name} />;',
                    filename: 'packages/ui/src/components/button/IconButton.tsx',
                },
                {
                    code: 'const glyph = <AddIcon />;',
                    filename: 'packages/ui/src/components/button/Button.tsx',
                },
            ],
            invalid: [
                {
                    code: 'const glyph = <svg><path /></svg>;',
                    filename: 'packages/ui/src/components/Button.tsx',
                    errors: [{ messageId: 'svgElement' }],
                },
                {
                    code: "import glyph from './search.svg';",
                    filename: 'apps/sync/src/App.tsx',
                    errors: [{ messageId: 'svgImport' }],
                },
                {
                    code: "import { Search } from 'lucide-react';",
                    filename: 'packages/icons/src/icon.tsx',
                    errors: [{ messageId: 'lucideImport' }],
                },
                {
                    code: "import { Search } from 'lucide-react/icons/search';",
                    filename: 'packages/ui/src/components/Input.tsx',
                    errors: [{ messageId: 'lucideImport' }],
                },
                {
                    code: "import { Add } from '@vscode/codicons';",
                    filename: 'packages/ui/src/components/Button.tsx',
                    errors: [{ messageId: 'codiconsImport' }],
                },
                {
                    code: "import gear from '@vscode/codicons/src/icons/settings-gear.svg';",
                    filename: 'apps/async/src/renderer/features/connections/Panel.tsx',
                    errors: [{ messageId: 'svgImport' }, { messageId: 'codiconsImport' }],
                },
                {
                    code: "const source = await import('@vscode/codicons');",
                    filename: 'apps/sync/src/renderer/App.tsx',
                    errors: [{ messageId: 'codiconsImport' }],
                },
                {
                    code: "const sheet = require('@vscode/codicons/dist/codicon.css');",
                    filename: 'packages/shell/src/components/Shell.tsx',
                    errors: [{ messageId: 'codiconsImport' }],
                },
                {
                    code: "export { add } from '@vscode/codicons/src/icons/add.svg';",
                    filename: 'packages/store-fs/src/store.ts',
                    errors: [{ messageId: 'codiconsImport' }],
                },
                {
                    code: 'const glyph = <Icon name="add" />;',
                    filename: 'packages/ui/src/components/button/IconButton.tsx',
                    errors: [{ messageId: 'iconLiteral' }],
                },
            ],
        });
    });
});
