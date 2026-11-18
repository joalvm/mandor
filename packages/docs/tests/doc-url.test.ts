import { describe, expect, it } from 'vitest';

import { docUrl } from '../src/lib/doc-url.js';

describe('the links a doc may carry', () => {
    it.each([
        'mandor://local-apis/events/doc/readme.md',
        'http://example.com/a',
        'https://example.com/a',
        'HTTPS://EXAMPLE.COM',
    ])('keeps %s', (url) => {
        expect(docUrl(url, 'href')).toBe(url);
    });

    it.each(['#seccion', 'otro-doc', './otro.md', '../otro.md', 'a/b?x=1:2', '?q=a:b'])(
        'keeps %s, a path or an anchor against the doc itself',
        (url) => {
            expect(docUrl(url, 'href')).toBe(url);
        },
    );

    it.each([
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        'java\nscript:alert(1)',
        'data:text/html,<b>',
        'file:///etc/passwd',
        'mailto:a@b.c',
        'ftp://example.com',
    ])('drops %s, which names nothing the app opens', (url) => {
        expect(docUrl(url, 'href')).toBe('');
    });

    /** A doc names no hosts: `//host/path` would borrow the scheme of the page. */
    it('drops a link that names a host without a scheme', () => {
        expect(docUrl('//evil.example/x', 'href')).toBe('');
    });
});

describe('the images a doc may carry', () => {
    it.each(['img.png', './img.png', 'assets/img.png', './a/b:c.png'])(
        'keeps %s, which arrived with the repo',
        (url) => {
            expect(docUrl(url, 'src')).toBe(url);
        },
    );

    /** An image is fetched with nobody clicking it: a remote one is a report to a stranger. */
    it.each([
        'https://example.com/pixel.png',
        'http://example.com/pixel.png',
        'mandor://local-apis/events/doc/x.md',
        'data:image/png;base64,AAAA',
        '//example.com/pixel.png',
    ])('drops %s', (url) => {
        expect(docUrl(url, 'src')).toBe('');
    });

    it('drops a path that climbs out of the workspace, with either separator', () => {
        expect(docUrl('../secreto.png', 'src')).toBe('');
        expect(docUrl('a/../../secreto.png', 'src')).toBe('');
        expect(docUrl('a\\..\\secreto.png', 'src')).toBe('');
    });

    it('drops an absolute path', () => {
        expect(docUrl('/etc/passwd', 'src')).toBe('');
    });
});
