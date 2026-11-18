import { SCRIPT_API } from '@mandor/script';
import { describe, expect, it } from 'vitest';

import { scriptSuggestions } from '../../src/lib/script-suggestions.js';

/** What the list offers with the caret at the end of the text. */
function offered(event: Parameters<typeof scriptSuggestions>[0], text: string): string[] {
    return scriptSuggestions(event, (docKey) => `doc of ${docKey}`)(text, text.length).map(
        ({ label }) => label,
    );
}

describe('what the editor of a script suggests', () => {
    it('offers the names in scope of the event, and not those of another', () => {
        expect(offered('onBeforeRequest', '')).toEqual(
            expect.arrayContaining(['console', 'vars', 'request', 'sendRequest']),
        );
        expect(offered('onBeforeRequest', '')).not.toContain('response');
        expect(offered('onResponse', '')).toContain('response');
        expect(offered('onMessage', '')).not.toContain('sendRequest');
    });

    /** The editor replaces only the word being written: the whole path again would repeat it. */
    it('offers the step after the last dot, once each', () => {
        expect(offered('onBeforeRequest', 'request.')).toEqual([
            'url',
            'method',
            'body',
            'headers',
            'query',
        ]);
        expect(offered('onBeforeRequest', 'const a = request.headers.se')).toEqual([
            'get',
            'has',
            'set',
            'delete',
        ]);
    });

    it('says what a name does and how it is called, only once the step is the name itself', () => {
        const [headers] = scriptSuggestions('onBeforeRequest', (docKey) => `doc of ${docKey}`)(
            'request.he',
            'request.he'.length,
        ).filter(({ label }) => label === 'headers');
        const [set] = scriptSuggestions('onBeforeRequest', (docKey) => `doc of ${docKey}`)(
            'vars.',
            'vars.'.length,
        ).filter(({ label }) => label === 'set');

        expect(headers).toEqual({ insertText: 'headers', kind: 'field', label: 'headers' });
        expect(set).toEqual({
            detail: '(name: string, value: unknown): void',
            documentation: 'doc of script.api.vars.set',
            insertText: 'set',
            kind: 'directive',
            label: 'set',
        });
    });

    it('offers every name of the API in some event', () => {
        const events = [
            'onBeforeRequest',
            'onResponse',
            'onBeforeConnect',
            'onConnect',
            'onMessage',
        ] as const;
        const reached = new Set(
            events.flatMap((event) =>
                SCRIPT_API.filter(({ name }) => {
                    const dot = name.lastIndexOf('.');

                    return offered(event, name.slice(0, dot + 1)).includes(name.slice(dot + 1));
                }).map(({ name }) => name),
            ),
        );

        expect([...reached].sort()).toEqual(SCRIPT_API.map(({ name }) => name).sort());
    });
});
