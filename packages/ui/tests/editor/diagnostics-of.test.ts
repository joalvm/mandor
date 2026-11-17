import { describe, expect, it } from 'vitest';

import { diagnosticsOf } from '../../src/editor/diagnostics-of.js';

const SCHEMA = '{"type": "object", "properties": {"a": {"type": "string"}}}';

describe('what the margin of an editor checks', () => {
    /** A reader cannot fix what the margin would point at, so it points at nothing. */
    it('checks nothing a reader cannot change', () => {
        expect(diagnosticsOf('jsonc', { readOnly: true })).toBeNull();
        expect(diagnosticsOf('xml', { readOnly: true })).toBeNull();
    });

    it('leaves prose, pages, bytes and plain text unchecked', () => {
        expect(diagnosticsOf('markdown', {})).toBeNull();
        expect(diagnosticsOf('html', {})).toBeNull();
        expect(diagnosticsOf('binary', {})).toBeNull();
        expect(diagnosticsOf('plaintext', {})).toBeNull();
    });

    it('marks broken JSON', () => {
        expect(diagnosticsOf('jsonc', {})?.('{"a": }')).toMatchObject([
            { message: 'Value expected', severity: 'error' },
        ]);
    });

    it('marks the first error of broken XML', () => {
        expect(diagnosticsOf('xml', {})?.('<a><b></a>')).toHaveLength(1);
    });

    it('checks JSON against its schema and says so in the words of its caller', () => {
        const check = diagnosticsOf('jsonc', {
            schemaLint: { schema: () => SCHEMA },
            translate: (message) => `translated: ${message}`,
        });
        const found = check?.('{"a": 1}') ?? [];

        expect(found.length).toBeGreaterThan(0);
        expect(found.every((diagnostic) => diagnostic.message.startsWith('translated: '))).toBe(
            true,
        );
    });

    it('hands its caller the rule a schema mark speaks for, to word it from', () => {
        const check = diagnosticsOf('jsonc', {
            schemaLint: { schema: () => SCHEMA },
            translate: (message, rule) => `${rule?.keyword ?? 'none'}: ${message}`,
        });

        expect(check?.('{"a": 1}')).toMatchObject([{ message: 'type: must be string' }]);
    });

    /**
     * A broken bracket is read by whoever is writing the payload, and they read the window in
     * their own language: the words of the margin are the caller's, wherever the mark came from.
     */
    it('says what broke the syntax in the words of its caller', () => {
        const translate = (message: string) => `translated: ${message}`;

        expect(diagnosticsOf('jsonc', { translate })?.('{"a": }')).toMatchObject([
            { message: 'translated: Value expected' },
        ]);
        const xml = diagnosticsOf('xml', { translate })?.('<a><b></a>');

        expect(xml?.[0]?.message.startsWith('translated: ')).toBe(true);
    });

    /** The schema is written beside the payload, so it is read again on every check. */
    it('reads the schema again on every check', () => {
        const schema = { text: '' };
        const check = diagnosticsOf('jsonc', { schemaLint: { schema: () => schema.text } });

        expect(check?.('{"a": 1}')).toEqual([]);

        schema.text = SCHEMA;

        expect(check?.('{"a": 1}')).not.toEqual([]);
    });

    describe('what its caller asks it to check besides', () => {
        const noEven = (text: string) =>
            text.length % 2 === 0
                ? [{ from: 0, message: 'even', severity: 'warning' as const, to: text.length }]
                : [];

        it('checks a language that has nothing of its own, with what the caller gave', () => {
            expect(diagnosticsOf('plaintext', { check: noEven })?.('ab')).toMatchObject([
                { message: 'even' },
            ]);
        });

        it('adds the marks of the caller to the marks of the language', () => {
            const found = diagnosticsOf('jsonc', { check: noEven })?.('{"a":  }') ?? [];

            expect(found.map((diagnostic) => diagnostic.message)).toEqual([
                'Value expected',
                'even',
            ]);
        });

        it('says the marks of the caller as the caller wrote them, not through its translation', () => {
            const check = diagnosticsOf('jsonc', {
                check: noEven,
                translate: (message) => `translated: ${message}`,
            });

            expect(check?.('{"a":  }').map((diagnostic) => diagnostic.message)).toEqual([
                'translated: Value expected',
                'even',
            ]);
        });

        it('still checks nothing a reader cannot change', () => {
            expect(diagnosticsOf('plaintext', { check: noEven, readOnly: true })).toBeNull();
        });
    });
});
