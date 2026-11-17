import { describe, expect, it } from 'vitest';

import { titleOfLink } from '../src/lib/doc-title-link.js';

describe('the title a link of a doc names', () => {
    it.each([
        ['Guía', 'Guía'],
        ['Gu%C3%ADa%20de%20inicio', 'Guía de inicio'],
        ['./Guía.md', 'Guía'],
        ['100%', '100%'],
    ])('reads %s as %s', (href, title) => {
        expect(titleOfLink(href)).toBe(title);
    });

    it.each(['#seccion', '//host/x', 'https://a.test', 'mandor://local/w/doc/a.md'])(
        'leaves %s alone, which names something else',
        (href) => {
            expect(titleOfLink(href)).toBeNull();
        },
    );
});
