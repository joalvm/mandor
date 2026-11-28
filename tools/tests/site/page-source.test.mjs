import { describe, expect, it } from 'vitest';

import { escapeHtml, escapeWords, fill, parsePage } from '../../site/page-source.mjs';

describe('a page of the site', () => {
    it('reads its fields from the comment it opens with, and keeps the rest as its body', () => {
        const page = parsePage(
            '<!--\ntitle: Privacy\ndescription: What: nothing\n-->\n<h1>Hi</h1>\n',
        );

        expect(page.fields).toEqual({ title: 'Privacy', description: 'What: nothing' });
        expect(page.body).toBe('<h1>Hi</h1>\n');
    });

    it('reads a page written with Windows line ends the same way', () => {
        const page = parsePage('<!--\r\ntitle: Terms\r\n-->\r\n<p>x</p>');

        expect(page.fields).toEqual({ title: 'Terms' });
        expect(page.body).toBe('<p>x</p>');
    });

    it('is refused when it opens with no fields', () => {
        expect(() => parsePage('<h1>Hi</h1>', 'site/pages/en/index.html')).toThrow(
            'site/pages/en/index.html opens with no <!-- fields --> comment.',
        );
    });
});

describe('a template', () => {
    it('takes each gap from its value, through groups, as the HTML it already is', () => {
        const html = fill('<a href="{{root}}x">{{ t.nav.home }}</a>', {
            root: '../',
            t: { nav: { home: '<b>Home</b>' } },
        });

        expect(html).toBe('<a href="../x"><b>Home</b></a>');
    });

    it('stops at a gap with no value, naming the file and the gap', () => {
        expect(() => fill('<p>{{t.missing}}</p>', { t: {} }, 'site/layout.html')).toThrow(
            'site/layout.html has a gap with no text: {{t.missing}}.',
        );
    });

    it('stops at a gap whose value is a group rather than a text', () => {
        expect(() => fill('{{t}}', { t: { a: 'x' } })).toThrow('{{t}}');
    });

    it('leaves braces that are no gap as they are', () => {
        expect(fill('{ "a": 1 } {{ 9 }}', {})).toBe('{ "a": 1 } {{ 9 }}');
    });
});

describe('the words of a page', () => {
    it('are escaped for HTML, every one, keeping the shape of the tree', () => {
        expect(escapeWords({ a: 'R&D', b: { c: '<i>', d: '"x" \'y\'' } })).toEqual({
            a: 'R&amp;D',
            b: { c: '&lt;i&gt;', d: '&quot;x&quot; &#39;y&#39;' },
        });
    });

    it('escape a number as its text', () => {
        expect(escapeHtml(5)).toBe('5');
    });
});
