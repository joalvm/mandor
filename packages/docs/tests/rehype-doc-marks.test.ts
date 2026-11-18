import type { Element, ElementContent, Root } from 'hast';
import { describe, expect, it } from 'vitest';

import { rehypeDocMarks } from '../src/lib/rehype-doc-marks.js';

function element(tagName: string, children: ElementContent[] = [], properties = {}): Element {
    return { children, properties, tagName, type: 'element' };
}

function text(value: string): ElementContent {
    return { type: 'text', value };
}

function marked(...children: ElementContent[]): Root {
    const tree: Root = { children, type: 'root' };

    rehypeDocMarks()(tree);

    return tree;
}

function first(tree: Root): Element {
    const [node] = tree.children;

    if (node?.type !== 'element') {
        throw new Error('The tree lost its first element.');
    }

    return node;
}

describe('the alerts of a doc', () => {
    it('takes the mark off the first line and puts its kind on the quote', () => {
        const quote = first(
            marked(element('blockquote', [element('p', [text('[!WARNING]\nCaduca pronto.')])])),
        );

        expect(quote.properties['dataAlert']).toBe('warning');
        expect(quote.children).toEqual([element('p', [text('Caduca pronto.')])]);
    });

    /** `> [!NOTE]` on a line of its own leaves a paragraph of nothing, which would be a gap. */
    it('drops the paragraph that held nothing but the mark', () => {
        const quote = first(
            marked(
                element('blockquote', [
                    text('\n'),
                    element('p', [text('[!TIP]')]),
                    element('p', [text('Usa el entorno local.')]),
                ]),
            ),
        );

        expect(quote.properties['dataAlert']).toBe('tip');
        expect(quote.children).toEqual([text('\n'), element('p', [text('Usa el entorno local.')])]);
    });

    it('leaves a quote alone when its first line is not one of the five marks', () => {
        const quote = first(marked(element('blockquote', [element('p', [text('[!TODAY] Hoy.')])])));

        expect(quote.properties['dataAlert']).toBeUndefined();
        expect(quote.children).toEqual([element('p', [text('[!TODAY] Hoy.')])]);
    });

    it('leaves alone a quote that opens with anything but text, or holds no paragraph', () => {
        const strong = element('blockquote', [
            element('p', [element('strong', [text('[!NOTE]')])]),
        ]);
        const bare = element('blockquote', [text('suelto')]);

        marked(strong, bare);

        expect(strong.properties['dataAlert']).toBeUndefined();
        expect(bare.properties['dataAlert']).toBeUndefined();
    });
});

describe('the tasks of a doc', () => {
    /** Ticking a box on the page ticks the box of the text with the same number. */
    it('numbers the boxes in the order the page draws them, wherever they are', () => {
        const box = (): Element => element('input', [], { type: 'checkbox' });
        const one = box();
        const two = box();
        const field = element('input', [], { type: 'text' });

        marked(element('ul', [element('li', [one])]), field, element('blockquote', [two]));

        expect(one.properties['dataTask']).toBe(0);
        expect(two.properties['dataTask']).toBe(1);
        expect(field.properties['dataTask']).toBeUndefined();
    });
});
