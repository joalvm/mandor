import { describe, expect, it } from 'vitest';

import { signCreatedStyles } from '../../src/lib/style-nonce.js';

const NONCE = 'ZmFrZS1ub25jZS0xMjM0';

/** The document read by the one form of `createElement` the wrapper stands in for. */
type CreatesElements = { createElement: (tagName: string) => HTMLElement };

/**
 * The cases run in order on one document: the window is signed before its nonce is declared, the
 * way a test harness would, and every style created afterwards reads the nonce at that moment.
 */
describe('the style elements the window creates', () => {
    it('carry no nonce while the window declares none', () => {
        signCreatedStyles();

        expect(document.createElement('style').hasAttribute('nonce')).toBe(false);
    });

    it('carry the nonce the window was served with', () => {
        const meta = document.createElement('meta');

        meta.name = 'csp-nonce';
        meta.content = NONCE;
        document.head.append(meta);

        expect(document.createElement('style').getAttribute('nonce')).toBe(NONCE);
    });

    it('leave every other element as it was', () => {
        expect(document.createElement('div').hasAttribute('nonce')).toBe(false);
    });

    /** A window that is signed twice, by a reload of its entry, is still wrapped only once. */
    it('are signed by one wrapper however many times the window is signed', () => {
        const page: CreatesElements = document;
        const wrapper = page.createElement;

        signCreatedStyles();

        expect(page.createElement).toBe(wrapper);
        expect(document.createElement('style').getAttribute('nonce')).toBe(NONCE);
    });
});
