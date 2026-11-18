import type { RequestExample, RequestLine } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { answeringExamples } from '../../../../../../src/renderer/features/requests/lib/compare/answering-examples.js';

function line(key: string, value: string, enabled = true): RequestLine {
    return { enabled, key, value };
}

function answer(name: string, status: string, query?: RequestLine[]) {
    const example: RequestExample = {
        body: '',
        contentType: 'application/json',
        name,
        status,
        ...(query !== undefined && { request: { query } }),
    };

    return { example, key: name };
}

function names(answers: { key: string }[]): string[] {
    return answers.map(({ key }) => key);
}

describe('the examples an answer may stand for (answeringExamples)', () => {
    it('keeps only those whose status covers the one that came', () => {
        const answers = [
            answer('creado', '201'),
            answer('ok', '200'),
            answer('éxito', '2XX'),
            answer('error', '4XX'),
            answer('otro', 'default'),
        ];

        expect(names(answeringExamples(answers, 200, []))).toEqual(['ok', 'éxito', 'otro']);
        expect(answeringExamples(answers.slice(0, 1), 500, [])).toEqual([]);
    });

    it('puts first the one whose pinned params were sent with their values', () => {
        const answers = [
            answer('completo', '200'),
            answer('campos', '200', [line('fields', 'id,name')]),
            answer('paginado', '200', [line('paginate', 'true')]),
        ];

        expect(names(answeringExamples(answers, 200, [line('paginate', 'true')]))).toEqual([
            'paginado',
            'completo',
            'campos',
        ]);
        expect(names(answeringExamples(answers, 200, [line('fields', 'id,name')]))[0]).toBe(
            'campos',
        );
        expect(names(answeringExamples(answers, 200, undefined))[0]).toBe('completo');
    });

    it('counts a param sent with another value against, and a variable as any value', () => {
        const answers = [
            answer('página dos', '200', [line('page', '2')]),
            answer('cualquiera', '200', [line('page', '{{page}}')]),
        ];

        expect(names(answeringExamples(answers, 200, [line('page', '7')]))).toEqual([
            'cualquiera',
            'página dos',
        ]);
        expect(names(answeringExamples(answers, 200, [line('page', '{{p}}')]))).toEqual([
            'página dos',
            'cualquiera',
        ]);
    });

    it('reads neither lines switched off nor lines without a key', () => {
        const answers = [
            answer('apagado', '200', [line('fields', 'id', false), line(' ', 'x')]),
            answer('pide', '200', [line('fields', 'id')]),
        ];

        expect(names(answeringExamples(answers, 200, [line('fields', 'id', false)]))).toEqual([
            'apagado',
            'pide',
        ]);
    });

    it('takes a key sent twice, and breaks a tie by the narrower status, then by order', () => {
        const answers = [
            answer('familia', '2XX', [line('tag', 'b')]),
            answer('código', '200', [line('tag', 'b')]),
            answer('también', '200', [line('tag', 'b')]),
            answer('raro', 'teapot'),
        ];
        const sent = [line('tag', 'a'), line('tag', 'b')];

        expect(names(answeringExamples(answers, 200, sent))).toEqual([
            'código',
            'también',
            'familia',
        ]);
    });
});
