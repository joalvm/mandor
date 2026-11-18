import { describe, expect, it } from 'vitest';

import { composeScope, resolveTemplates, resolveText } from '../../src/index.js';

const scope = composeScope({
    script: { copied: 'Bearer {{TOKEN}}', plain: '{{host}}' },
    environment: { TOKEN: 'tok_abcdefgh', host: 'env.example.com', inner: '{{TOKEN}}' },
    secret: ['TOKEN'],
});

describe('resolving a text that uses a secret', () => {
    /** A used name carries whether its level declared it secret: the redaction layer asks. */
    it('says of every used name whether the level that gave the value declared it secret', () => {
        const scope = composeScope({
            environment: { TOKEN: 'tok_abcdefgh', host: 'env.example.com' },
            secret: ['TOKEN'],
        });

        expect(resolveText('{{host}}/{{TOKEN}}', scope).used).toEqual([
            { name: 'host', level: 'environment', secret: false },
            { name: 'TOKEN', level: 'environment', secret: true },
        ]);
    });

    it('leaves a secret as its name with secrets off, and says which it left', () => {
        expect(
            resolveText('{{host}}/{{TOKEN}}/{{inner}}/{{TOKEN}}', scope, { secrets: 'off' }),
        ).toEqual({
            text: 'env.example.com/{{TOKEN}}/{{TOKEN}}/{{TOKEN}}',
            used: [
                { name: 'host', level: 'environment', secret: false },
                { name: 'inner', level: 'environment', secret: false },
            ],
            missing: [],
            withheld: ['TOKEN'],
        });
    });

    it('gives with secrets on, or no option, the same result it always gave', () => {
        const today = resolveText('{{host}}/{{TOKEN}}', scope);

        expect(today).toEqual({
            text: 'env.example.com/tok_abcdefgh',
            used: [
                { name: 'host', level: 'environment', secret: false },
                { name: 'TOKEN', level: 'environment', secret: true },
            ],
            missing: [],
        });
        expect(resolveText('{{host}}/{{TOKEN}}', scope, { secrets: 'on' })).toEqual(today);
    });

    /** A script can write `{{token}}` into a variable; that is not the person asking for it. */
    it('resolves what a script value nests with secrets off, whatever the caller asked', () => {
        expect(resolveText('{{copied}} {{plain}}', scope)).toMatchObject({
            text: 'Bearer {{TOKEN}} env.example.com',
            withheld: ['TOKEN'],
        });
    });

    it('turns secrets off only in the fields the caller names, and fuses what each withheld', () => {
        const result = resolveTemplates(
            {
                url: 'https://{{host}}/{{TOKEN}}',
                'header:0:value': '{{TOKEN}}',
                body: '{{copied}}',
            },
            scope,
            { secretsOff: (field) => field === 'header:0:value' },
        );

        expect(result.values).toEqual({
            url: 'https://env.example.com/tok_abcdefgh',
            'header:0:value': '{{TOKEN}}',
            body: 'Bearer {{TOKEN}}',
        });
        expect(result.withheld).toEqual(['TOKEN']);
    });

    it('names no withheld when nothing was left', () => {
        expect(
            resolveTemplates({ url: '{{host}}' }, scope, { secretsOff: () => true }),
        ).not.toHaveProperty('withheld');
    });
});
