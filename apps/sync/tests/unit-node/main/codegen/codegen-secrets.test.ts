import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SNIPPET_TARGETS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { codeOf, line, SECRET, SPELLINGS, useCodegenHarness } from './support/codegen-harness.js';

const harness = useCodegenHarness();

function expectNoSecret(code: string, forbidden: readonly string[]) {
    for (const spelling of forbidden) {
        expect(code).not.toContain(spelling);
    }
}

describe('what a snippet never says', () => {
    it.each(SNIPPET_TARGETS)('keeps the secret out of the %s snippet', async (target) => {
        const { code } = await codeOf(
            harness.ipc(),
            {
                method: 'POST',
                url: 'http://api.test/search',
                query: [line('q', '{{token}}')],
                headers: [line('X-Trace', '{{token}}')],
                body: { type: 'json', content: '{"t":"{{token}}"}' },
            },
            target,
        );

        expectNoSecret(code, SPELLINGS);
        expect(code).toContain('api.test');
    });

    it('says a credential written by hand as it was written', async () => {
        const { code } = await codeOf(
            harness.ipc(),
            {
                url: 'http://api.test/',
                headers: [line('Authorization', 'Bearer written-by-hand')],
                auth: { type: 'apikey', name: 'X-Key', value: 'typed-key-value', in: 'header' },
            },
            'curl',
        );

        expect(code).toContain('Bearer written-by-hand');
        expect(code).toContain('typed-key-value');
    });

    it('shows the mark in place of the secret in the curl', async () => {
        const { code } = await codeOf(
            harness.ipc(),
            { url: 'http://api.test/', headers: [line('X-Trace', '{{token}}')] },
            'curl',
        );

        expect(code).toContain('[redacted]');
    });

    it.each(SNIPPET_TARGETS)('keeps a secret in a path parameter out of %s', async (target) => {
        const { code } = await codeOf(
            harness.ipc(),
            { url: 'http://api.test/items/{id}', pathParams: [line('id', '{{token}}')] },
            target,
        );

        expectNoSecret(code, SPELLINGS);
        expect(code).toContain('/items/');
    });

    it.each(SNIPPET_TARGETS)('keeps the basic credential out of %s', async (target) => {
        const encoded = Buffer.from(`ana:${SECRET}`).toString('base64');
        const { code } = await codeOf(
            harness.ipc(),
            {
                url: 'http://api.test/',
                auth: { type: 'basic', username: 'ana', password: '{{token}}' },
            },
            target,
        );

        expect(code).not.toContain(encoded);
        expect(code).not.toMatch(/Basic [A-Za-z0-9+/=]{8,}/);
    });

    it('writes the mark for an OAuth2 token without asking the token server', async () => {
        await writeFile(
            join(harness.root(), 'workspaces', 'payments', 'workspace.yaml'),
            [
                'name: Payments',
                'kind: sync',
                'id: payments',
                'auth:',
                '  type: oauth2-client-credentials',
                // Nothing listens here: asking for the token would fail the snippet.
                '  tokenUrl: "http://127.0.0.1:1/token"',
                '  clientId: client',
                '  clientSecret: shh',
                '  clientAuth: basic',
                '',
            ].join('\n'),
            'utf8',
        );

        const { code } = await codeOf(harness.ipc(), { url: 'http://api.test/' }, 'curl');

        expect(code).toContain('Authorization: Bearer [redacted]');
    });
});
