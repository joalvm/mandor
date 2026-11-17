import { describe, expect, it } from 'vitest';

import { SNIPPET_TARGETS, snippetTargetSchema } from '../../src/request/snippet-target.js';

describe('the languages a request can be copied as', () => {
    it('lists the ten, curl for bash and for cmd first', () => {
        expect(SNIPPET_TARGETS).toEqual([
            'curl',
            'curl-cmd',
            'js-fetch',
            'node-axios',
            'python-requests',
            'go-native',
            'java-okhttp',
            'csharp-httpclient',
            'php-curl',
            'powershell-webrequest',
        ]);
    });

    it.each(SNIPPET_TARGETS)('reads %s', (target) => {
        expect(snippetTargetSchema.parse(target)).toBe(target);
    });

    it('does not read a language that is not listed', () => {
        expect(snippetTargetSchema.safeParse('ruby').success).toBe(false);
    });
});
