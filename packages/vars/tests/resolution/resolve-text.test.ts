import { describe, expect, it } from 'vitest';

import { resolveText, type VariableScope } from '../../src/index.js';
import {
    MAX_EXPANDED_LENGTH,
    MAX_EXPANSIONS,
    MAX_RESOLUTION_DEPTH,
} from '../../src/resolution/resolve-text.js';

const scope: VariableScope = [
    { name: 'environment', values: { host: 'env.example.com', token: 'env-token' } },
    { name: 'globals', values: { host: 'ws.example.com' } },
];

/** Each level names the one below `fanOut` times: what a few lines can ask is exponential. */
function bombOf(fanOut: number, bottom: string): Record<string, string> {
    const values: Record<string, string> = { v0: bottom };

    for (let index = 1; index < MAX_RESOLUTION_DEPTH; index += 1) {
        values[`v${String(index)}`] = `{{v${String(index - 1)}}}`.repeat(fanOut);
    }

    return values;
}

function chainOf(length: number): Record<string, string> {
    const values: Record<string, string> = {};

    for (let index = 1; index < length; index += 1) {
        values[`v${String(index)}`] = `{{v${String(index + 1)}}}`;
    }

    values[`v${String(length)}`] = 'bottom';

    return values;
}

describe('resolveText', () => {
    it('returns a text without placeholders identical', () => {
        const result = resolveText('wss://example.com/socket', scope);

        expect(result).toEqual({ text: 'wss://example.com/socket', used: [], missing: [] });
    });

    it('substitutes a placeholder with the value of the level that defines it', () => {
        const result = resolveText('wss://{{host}}/socket', scope);

        expect(result.text).toBe('wss://env.example.com/socket');
        expect(result.used).toEqual([{ name: 'host', level: 'environment', secret: false }]);
        expect(result.missing).toEqual([]);
    });

    it('lets the strongest level win when two levels define the same name', () => {
        const result = resolveText('{{host}}', scope);

        expect(result.text).toBe('env.example.com');
        expect(result.used).toEqual([{ name: 'host', level: 'environment', secret: false }]);
    });

    it('lets the environment win over the workspace and the workspace over the dynamic level', () => {
        const result = resolveText('{{host}} {{port}}', [
            { name: 'environment', values: { host: 'env.example.com' } },
            { name: 'globals', values: { host: 'ws.example.com', port: 'ws-port' } },
            { name: 'dynamic', values: { host: 'dyn', port: 'dyn-port' } },
        ]);

        expect(result.text).toBe('env.example.com ws-port');
    });

    /** Undefined is not empty: a silent `''` would send a broken value out. */
    it('keeps an undefined placeholder in the text and reports it as missing', () => {
        const result = resolveText('Bearer {{apiKey}}', scope);

        expect(result.text).toBe('Bearer {{apiKey}}');
        expect(result.used).toEqual([]);
        expect(result.missing).toEqual([{ name: 'apiKey', positions: [7] }]);
    });

    it('does not consult the scope for an escaped placeholder', () => {
        const result = resolveText('\\{{token}}', scope);

        expect(result).toEqual({ text: '{{token}}', used: [], missing: [] });
    });

    it('does not resolve a placeholder with spaces inside the braces', () => {
        const result = resolveText('{{ host }}', scope);

        expect(result).toEqual({ text: '{{ host }}', used: [], missing: [] });
    });

    it('reports a repeated name once, in used or in missing', () => {
        const result = resolveText('{{host}} {{host}} {{apiKey}} {{apiKey}}', scope);

        expect(result.used).toEqual([{ name: 'host', level: 'environment', secret: false }]);
        expect(result.missing).toEqual([{ name: 'apiKey', positions: [18, 29] }]);
    });

    /** The interface underlines each occurrence without scanning the text again. */
    it('reports the position of every appearance of a missing name', () => {
        const result = resolveText('x {{token}} y {{token}}', []);

        expect(result.missing).toEqual([{ name: 'token', positions: [2, 14] }]);
    });

    /**
     * The engine never sees secrecy: values arrive already resolved. The field is built
     * now so the redaction layer can mark every name that built a field without touching
     * this type, its tests and its callers again.
     */
    it('marks every used name as not secret', () => {
        const result = resolveText('{{host}}', scope);

        expect(result.used).toEqual([{ name: 'host', level: 'environment', secret: false }]);
    });

    it('resolves a dynamic variable reference when a level defines it', () => {
        const result = resolveText('id: {{$uuid}}', [
            { name: 'dynamic', values: { $uuid: 'fixed-uuid' } },
        ]);

        expect(result).toEqual({
            text: 'id: fixed-uuid',
            used: [{ name: '$uuid', level: 'dynamic', secret: false }],
            missing: [],
        });
    });
});

describe('recursive resolution', () => {
    it('resolves a value that itself references another variable', () => {
        const result = resolveText('{{a}}', [
            { name: 'environment', values: { a: '{{b}}', b: 'x' } },
        ]);

        expect(result).toEqual({
            text: 'x',
            used: [
                { name: 'a', level: 'environment', secret: false },
                { name: 'b', level: 'environment', secret: false },
            ],
            missing: [],
        });
    });

    /** The offset belongs to the caller's text; a name inside another value has none. */
    it('reports as missing a name referenced from inside another value, without a position', () => {
        const result = resolveText('{{token}}', [
            { name: 'environment', values: { token: '{{tokenFile}}' } },
        ]);

        expect(result.text).toBe('{{tokenFile}}');
        expect(result.used).toEqual([{ name: 'token', level: 'environment', secret: false }]);
        expect(result.missing).toEqual([{ name: 'tokenFile', positions: [] }]);
    });

    it('resolves a chain that reaches exactly the maximum depth', () => {
        const result = resolveText('{{v1}}', [
            { name: 'environment', values: chainOf(MAX_RESOLUTION_DEPTH) },
        ]);

        expect(result.text).toBe('bottom');
    });

    /**
     * A loop in the variables is the user's to see and fix, like a name nobody defined: the name
     * that closes it goes out as written, and nothing that sends or draws it breaks.
     */
    it('leaves the name that closes a cycle as written', () => {
        const result = resolveText('{{a}}', [
            { name: 'environment', values: { a: 'x{{b}}', b: 'y{{a}}' } },
        ]);

        expect(result.text).toBe('xy{{a}}');
        expect(result.used.map((entry) => entry.name)).toEqual(['a', 'b']);
        expect(result.missing).toEqual([]);
    });

    it('leaves a variable that names itself as written', () => {
        expect(resolveText('{{a}}', [{ name: 'environment', values: { a: '{{a}}' } }]).text).toBe(
            '{{a}}',
        );
    });

    it('leaves the name past the maximum depth of a real chain as written', () => {
        const result = resolveText('{{v1}}', [
            { name: 'environment', values: chainOf(MAX_RESOLUTION_DEPTH + 1) },
        ]);

        expect(result.text).toBe(`{{v${String(MAX_RESOLUTION_DEPTH + 1)}}}`);
    });

    /**
     * An environment comes down from an origin like any file. A few lines that name each other
     * over and over would otherwise ask more text than the machine holds, in main as it sends
     * and in the window as it paints: past the budget, a name stays as it was written.
     */
    it('stops copying values once a resolution has copied the most it may', () => {
        const values = bombOf(4, 'x'.repeat(1024 * 1024));
        const top = `v${String(MAX_RESOLUTION_DEPTH - 1)}`;
        const result = resolveText(`{{${top}}}`, [{ name: 'environment', values }]);

        // What is left as written is a few names; what was copied is within the budget.
        expect(result.text.length).toBeLessThan(MAX_EXPANDED_LENGTH + 4096);
        expect(result.text).toContain('{{v0}}');
        expect(result.text.startsWith('x'.repeat(1024 * 1024))).toBe(true);
    });

    it('stops looking names up once a resolution has looked up the most it may', () => {
        const values = bombOf(64, '');
        const top = `v${String(MAX_RESOLUTION_DEPTH - 1)}`;
        const result = resolveText(`{{${top}}}`, [{ name: 'environment', values }]);

        expect(result.text).toContain('{{v');
        expect(result.used.map((each) => each.name)).toContain('v0');
        expect(result.text.split('{{').length - 1).toBeLessThan(MAX_EXPANSIONS);
    });

    it('gives every resolution a budget of its own', () => {
        const values = bombOf(4, 'x'.repeat(1024 * 1024));
        const top = `v${String(MAX_RESOLUTION_DEPTH - 1)}`;
        const scope: VariableScope = [{ name: 'environment', values }];

        resolveText(`{{${top}}}`, scope);

        expect(resolveText('{{v0}}', scope).text).toBe('x'.repeat(1024 * 1024));
    });
});
