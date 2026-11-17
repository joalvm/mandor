import { SNIPPET_TARGETS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { SNIPPET_TARGET_LABELS } from '../../../../src/renderer/features/requests/lib/snippet-target-label.js';

describe('the names of the languages a request is copied as', () => {
    it('names every target with its own proper name', () => {
        expect(SNIPPET_TARGETS.map((target) => SNIPPET_TARGET_LABELS[target])).toEqual([
            'cURL (bash)',
            'cURL (cmd)',
            'JavaScript fetch',
            'Node.js axios',
            'Python requests',
            'Go net/http',
            'Java OkHttp',
            'C# HttpClient',
            'PHP cURL',
            'PowerShell Invoke-WebRequest',
        ]);
    });
});
