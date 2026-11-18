import { describe, expect, it } from 'vitest';

import { composeScope, templateStretches } from '../../src/index.js';

const SCOPE = composeScope({
    environment: { host: 'example.com', token: '', shared: 'ignored' },
    globals: { shared: 'ws' },
    secret: ['token'],
});

describe('stretching a template into tones', () => {
    it('returns one plain stretch when the text holds no placeholder', () => {
        expect(templateStretches('wss://example.com/socket', SCOPE)).toEqual([
            { text: 'wss://example.com/socket', tone: 'plain' },
        ]);
    });

    it('returns an empty list for an empty text', () => {
        expect(templateStretches('', SCOPE)).toEqual([]);
    });

    it('paints a declared variable with a value as known', () => {
        expect(templateStretches('wss://{{host}}/socket', SCOPE)).toEqual([
            { text: 'wss://', tone: 'plain' },
            { text: '{{host}}', tone: 'known', name: 'host' },
            { text: '/socket', tone: 'plain' },
        ]);
    });

    /** Empty is not missing: the name exists, only its value is blank. */
    it('paints a declared variable with an empty value as empty', () => {
        expect(templateStretches('Bearer {{token}}', SCOPE)).toEqual([
            { text: 'Bearer ', tone: 'plain' },
            { text: '{{token}}', tone: 'empty', name: 'token' },
        ]);
    });

    it('paints an undeclared variable as missing', () => {
        expect(templateStretches('{{nobody}}', SCOPE)).toEqual([
            { text: '{{nobody}}', tone: 'missing', name: 'nobody' },
        ]);
    });

    /** The workspace is the weaker level, but declaring there is declaring. */
    it('paints a variable declared on a weaker level as known', () => {
        expect(templateStretches('{{shared}}', SCOPE)).toEqual([
            { text: '{{shared}}', tone: 'known', name: 'shared' },
        ]);
    });

    /** `$` names answer without a declaration: the engine computes them. */
    it('paints a dynamic variable reference as known', () => {
        expect(templateStretches('id: {{$uuid}}', SCOPE)).toEqual([
            { text: 'id: ', tone: 'plain' },
            { text: '{{$uuid}}', tone: 'known', name: '$uuid' },
        ]);
    });

    /** A secret keeps its tone: the interface hides the value, not the name. */
    it('paints a secret variable with the tone its value earns', () => {
        const filled = composeScope({ environment: { host: 'example.com' }, secret: ['host'] });
        const blank = composeScope({ environment: { host: '' }, secret: ['host'] });

        expect(templateStretches('{{host}}', filled)).toEqual([
            { text: '{{host}}', tone: 'known', name: 'host' },
        ]);
        expect(templateStretches('{{host}}', blank)).toEqual([
            { text: '{{host}}', tone: 'empty', name: 'host' },
        ]);
    });

    /** The escape is how the user writes a literal brace, same as Postman. */
    it('paints an escaped placeholder as plain text', () => {
        expect(templateStretches('Bearer \\{{token}}', SCOPE)).toEqual([
            { text: 'Bearer ', tone: 'plain' },
            { text: '{{token}}', tone: 'plain' },
        ]);
    });

    /** The name is exact: whitespace inside the braces means it is not a placeholder. */
    it('paints a placeholder with spaces inside the braces as plain text', () => {
        expect(templateStretches('{{ host }}', SCOPE)).toEqual([
            { text: '{{ host }}', tone: 'plain' },
        ]);
    });

    /** An unclosed opening is the user still writing, not a token. */
    it('paints the open opening from its braces to the end of the text', () => {
        expect(templateStretches('wss://{{ho', SCOPE)).toEqual([
            { text: 'wss://', tone: 'plain' },
            { text: '{{ho', tone: 'open', name: 'ho' },
        ]);
    });

    it('paints an open opening alone as the whole text', () => {
        expect(templateStretches('{{', SCOPE)).toEqual([{ text: '{{', tone: 'open', name: '' }]);
    });

    /** What closed before stays a token; only the tail still being written is open. */
    it('paints a closed token and an open opening in the same text', () => {
        expect(templateStretches('{{host}} and {{to', SCOPE)).toEqual([
            { text: '{{host}}', tone: 'known', name: 'host' },
            { text: ' and ', tone: 'plain' },
            { text: '{{to', tone: 'open', name: 'to' },
        ]);
    });

    it('paints the text as plain when the open name holds a brace', () => {
        expect(templateStretches('{{ho{st', SCOPE)).toEqual([{ text: '{{ho{st', tone: 'plain' }]);
    });

    /** An escaped opening never opens: the user is writing a literal brace. */
    it('paints an escaped opening and its name as plain text', () => {
        expect(templateStretches('Bearer \\{{to', SCOPE)).toEqual([
            { text: 'Bearer \\{{to', tone: 'plain' },
        ]);
    });
});
