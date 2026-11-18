import { describe, expect, it } from 'vitest';

import { applyFrameTemplate, parseFrameTemplate } from '../../src/connection/frame-template.js';

describe('parseFrameTemplate', () => {
    it('reads a template of pure text as one text part', () => {
        expect(parseFrameTemplate('{"ping": true}')).toEqual({
            ok: true,
            parts: [{ kind: 'text', text: '{"ping": true}' }],
        });
    });

    it('reads a template as text, event and payload in the order they are written', () => {
        const parsed = parseFrameTemplate('{"event": {{event}}, "data": {{payload}}}');

        expect(parsed).toEqual({
            ok: true,
            parts: [
                { kind: 'text', text: '{"event": ' },
                { kind: 'event' },
                { kind: 'text', text: ', "data": ' },
                { kind: 'payload' },
                { kind: 'text', text: '}' },
            ],
        });
    });

    it('reads a token with air inside it', () => {
        expect(parseFrameTemplate('{{ payload }}')).toEqual({
            ok: true,
            parts: [{ kind: 'payload' }],
        });
    });

    it('leaves the holes of the environment alone, as text', () => {
        const parsed = parseFrameTemplate('{"server": "{{server}}", "data": {{payload}}}');

        expect(parsed).toEqual({
            ok: true,
            parts: [
                { kind: 'text', text: '{"server": "{{server}}", "data": ' },
                { kind: 'payload' },
                { kind: 'text', text: '}' },
            ],
        });
    });

    it('refuses a template that is not valid JSON', () => {
        const parsed = parseFrameTemplate('{"event": {{event}}');

        expect(parsed.ok).toBe(false);

        if (!parsed.ok) {
            expect(parsed.reason).toContain('valid JSON');
        }
    });

    it('refuses a template that holds more than one JSON value', () => {
        expect(parseFrameTemplate('{{payload}} {"a": 1}').ok).toBe(false);
    });

    it('refuses a token the writer wrapped in quotes, and names the token', () => {
        const quoted = parseFrameTemplate('{"event": "{{event}}"}');

        expect(quoted.ok).toBe(false);

        if (!quoted.ok) {
            expect(quoted.reason).toContain('event');
        }

        expect(parseFrameTemplate('{"data": "{{payload}}"}').ok).toBe(false);
    });
});

describe('applyFrameTemplate', () => {
    it('splices the event as a JSON string and the payload raw, and keeps the text as written', () => {
        const parsed = parseFrameTemplate('{"event": {{event}}, "data": {{payload}}}');

        if (!parsed.ok) {
            throw new Error('the template of the test should parse');
        }

        expect(
            applyFrameTemplate(parsed.parts, {
                event: 'order.created',
                payload: '{"id": 7}',
            }),
        ).toBe('{"event": "order.created", "data": {"id": 7}}');
    });

    it('escapes an event that carries what JSON reserves', () => {
        const parsed = parseFrameTemplate('[{{event}}]');

        if (!parsed.ok) {
            throw new Error('the template of the test should parse');
        }

        expect(applyFrameTemplate(parsed.parts, { event: 'say "hi"', payload: '' })).toBe(
            '["say \\"hi\\""]',
        );
    });

    it('applies a template of pure text without touching it', () => {
        const parsed = parseFrameTemplate('"ping"');

        if (!parsed.ok) {
            throw new Error('the template of the test should parse');
        }

        expect(applyFrameTemplate(parsed.parts, { event: 'x', payload: '{}' })).toBe('"ping"');
    });
});
