import type { Element } from 'hast';
import { describe, expect, it } from 'vitest';

import { anchorOf, languageOf, textOf } from '../src/lib/doc-hast.js';

function code(className?: string[]): Element {
    return {
        children: [{ type: 'text', value: 'const port = 8080;\n' }],
        properties: className === undefined ? {} : { className },
        tagName: 'code',
        type: 'element',
    };
}

describe('the plain text of a node', () => {
    it('joins the text of everything inside it, the way its reader would copy it', () => {
        const heading: Element = {
            children: [
                { type: 'text', value: 'Puesta ' },
                {
                    children: [{ type: 'text', value: 'en marcha' }],
                    properties: {},
                    tagName: 'em',
                    type: 'element',
                },
            ],
            properties: {},
            tagName: 'h2',
            type: 'element',
        };

        expect(textOf(heading)).toBe('Puesta en marcha');
    });

    it('is empty for no node and for a node that holds no text', () => {
        expect(textOf(undefined)).toBe('');
        expect(textOf({ type: 'comment', value: 'oculto' })).toBe('');
    });
});

describe('the language a fence names', () => {
    it('is read off the class of the code, without its prefix', () => {
        expect(languageOf(code(['hljs', 'language-ts']))).toBe('ts');
    });

    it('is nothing when the fence named none', () => {
        expect(languageOf(code())).toBeUndefined();
        expect(languageOf(code(['hljs']))).toBeUndefined();
        expect(languageOf({ type: 'text', value: 'texto' })).toBeUndefined();
        expect(languageOf(undefined)).toBeUndefined();
    });
});

describe('the anchor of a heading', () => {
    /** The links a doc already has were written against GitHub, so its spelling is the one. */
    it('is spelt the way GitHub spells it', () => {
        expect(anchorOf('Puesta en marcha')).toBe('puesta-en-marcha');
        expect(anchorOf('¿Qué es la API v2.0?')).toBe('qué-es-la-api-v20');
        expect(anchorOf('snake_case y kebab-case')).toBe('snake_case-y-kebab-case');
        expect(anchorOf('  Dos  espacios ')).toBe('dos--espacios');
    });
});
