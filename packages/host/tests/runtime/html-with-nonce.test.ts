import { describe, expect, it } from 'vitest';

import { htmlWithNonce } from '../../src/runtime/html-with-nonce.js';

const PAGE = '<!doctype html><html><head><title>Mandor</title></head><body></body></html>';

describe('the document the window is served', () => {
    it('carries the nonce of the run where a renderer can read it', () => {
        expect(htmlWithNonce(PAGE, 'abc123')).toContain('<meta name="csp-nonce" content="abc123">');
    });

    it('puts it before anything the head already had', () => {
        const html = htmlWithNonce(PAGE, 'abc123');

        expect(html.indexOf('csp-nonce')).toBeLessThan(html.indexOf('<title>'));
    });

    /**
     * A page with no head is a page nobody wrote: leaving it alone shows the mistake in the
     * window instead of hiding it behind a tag the parser puts somewhere else.
     */
    it('leaves a document with no head exactly as it came', () => {
        expect(htmlWithNonce('<p>hola</p>', 'abc123')).toBe('<p>hola</p>');
    });
});
