import { SNIPPET_TARGETS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { SNIPPET_TARGET_LANGUAGES } from '../../../../src/renderer/features/requests/lib/snippet-target-language.js';

describe('the grammar a request copied as code is read in', () => {
    it('reads every target in its own language, never as plain text', () => {
        expect(SNIPPET_TARGETS.map((target) => SNIPPET_TARGET_LANGUAGES[target])).toEqual([
            'shell',
            'bat',
            'javascript',
            'javascript',
            'python',
            'go',
            'java',
            'csharp',
            'php',
            'powershell',
        ]);
    });
});
