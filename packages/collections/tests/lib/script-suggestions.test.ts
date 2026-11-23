import { SCRIPT_API, scriptPathOf } from '@mandor/script';
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
            expect.arrayContaining(['console', 'atob', 'URLSearchParams', 'mandor']),
        );
        expect(offered('onBeforeRequest', 'mandor.')).toEqual(
            expect.arrayContaining(['variables', 'request', 'sendRequest']),
        );
        expect(offered('onBeforeRequest', 'mandor.')).not.toContain('response');
        expect(offered('onResponse', 'mandor.')).toContain('response');
        expect(offered('onMessage', 'mandor.')).not.toContain('sendRequest');
    });

    /** The editor replaces only the word being written: the whole path again would repeat it. */
    it('offers the step after the last dot, once each', () => {
        expect(offered('onBeforeRequest', 'mandor.request.')).toEqual([
            'url',
            'method',
            'body',
            'headers',
            'query',
        ]);
        expect(offered('onBeforeRequest', 'const a = mandor.request.headers.se')).toEqual([
            'get',
            'has',
            'set',
            'delete',
        ]);
    });

    it('says what a name does and how it is called, only once the step is the name itself', () => {
        const [headers] = scriptSuggestions('onBeforeRequest', (docKey) => `doc of ${docKey}`)(
            'mandor.request.he',
            'mandor.request.he'.length,
        ).filter(({ label }) => label === 'headers');
        const [set] = scriptSuggestions('onBeforeRequest', (docKey) => `doc of ${docKey}`)(
            'mandor.variables.',
            'mandor.variables.'.length,
        ).filter(({ label }) => label === 'set');

        expect(headers).toEqual({ insertText: 'headers', kind: 'field', label: 'headers' });
        expect(set).toEqual({
            detail: '(name: string, value: unknown): void',
            documentation: 'doc of script.api.variables.set',
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
                SCRIPT_API.map(scriptPathOf).filter((path) => {
                    const dot = path.lastIndexOf('.');

                    return offered(event, path.slice(0, dot + 1)).includes(path.slice(dot + 1));
                }),
            ),
        );

        expect([...reached].sort()).toEqual(SCRIPT_API.map(scriptPathOf).sort());
    });
});
