import { describe, expect, it } from 'vitest';

import { codegenSnippetRequestSchema, codegenSnippetResultSchema } from '../../src/index.js';

const INPUT = {
    workspaceId: 'payments',
    itemPath: 'orders/list',
    environmentId: 'local',
    request: {
        kind: 'request',
        name: 'orders',
        method: 'GET',
        url: '{{host}}/orders',
        params: [],
        headers: [],
        body: { type: 'none' },
        auth: { type: 'none' },
    },
    target: 'python-requests',
};

describe('the request of codegen:snippet', () => {
    it('is the request of a send, without the id of the send, and the language', () => {
        expect(codegenSnippetRequestSchema.safeParse(INPUT).success).toBe(true);
    });

    it('refuses a language that is not listed', () => {
        expect(codegenSnippetRequestSchema.safeParse({ ...INPUT, target: 'ruby' }).success).toBe(
            false,
        );
    });

    it('refuses the id of a send: a snippet is not one', () => {
        const sendId = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

        expect(codegenSnippetRequestSchema.safeParse({ ...INPUT, sendId }).success).toBe(false);
    });

    it('refuses to skip scripts: a snippet runs none', () => {
        expect(codegenSnippetRequestSchema.safeParse({ ...INPUT, skipScripts: true }).success).toBe(
            false,
        );
    });
});

describe('the answer of codegen:snippet', () => {
    it('carries the code and the file of the body it left out', () => {
        const answer = { ok: true, value: { code: 'curl https://h', leftOutFile: 'a.bin' } };

        expect(codegenSnippetResultSchema.parse(answer)).toEqual(answer);
    });

    it('says null when no file was left out', () => {
        const answer = { ok: true, value: { code: '', leftOutFile: null } };

        expect(codegenSnippetResultSchema.parse(answer)).toEqual(answer);
    });

    it('is a failure the interface can name by its code', () => {
        const answer = { ok: false, error: { code: 'snippet-failed', message: 'nothing' } };

        expect(codegenSnippetResultSchema.parse(answer)).toEqual(answer);
    });
});
