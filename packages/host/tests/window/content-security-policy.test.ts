import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy } from '../../src/window/content-security-policy.js';

/** Reads one directive out of the header, so a test asserts on values and not on spacing. */
function directive(policy: string, name: string): string[] {
    const found = policy
        .split(';')
        .map((part) => part.trim())
        .find((part) => part === name || part.startsWith(`${name} `));

    return found === undefined ? [] : found.split(/\s+/).slice(1);
}

const NONCE = 'ZmFrZS1ub25jZS0xMjM0';

describe('the content security policy', () => {
    it('closes every fallback it can in production', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'default-src')).toEqual(["'self'"]);
        expect(directive(policy, 'object-src')).toEqual(["'none'"]);
        expect(directive(policy, 'frame-src')).toEqual(["'none'"]);
        expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
        expect(directive(policy, 'base-uri')).toEqual(["'none'"]);
        expect(directive(policy, 'form-action')).toEqual(["'none'"]);
    });

    it('allows no inline code, no inline stylesheet and no eval in production', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'script-src')).toEqual(["'self'"]);
        expect(directive(policy, 'style-src')).not.toContain("'unsafe-inline'");
        expect(policy).not.toContain('unsafe-eval');
    });

    /**
     * The editor lays out every line it draws with a `style` attribute written into its markup,
     * and no nonce or hash can sign an attribute. An attribute runs nothing: this opens the look
     * of an element, never what it does, and the stylesheets stay signed.
     */
    it('opens style attributes for the editor to lay its lines out, and no other inline style', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'style-src-attr')).toEqual(["'unsafe-inline'"]);
        expect(directive(policy, 'style-src-elem')).toEqual([]);
    });

    it('keeps the renderer off the network: the sockets live in main', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'connect-src')).toEqual(["'self'"]);
    });

    it('starts no worker from a blob: the editor needs none', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'worker-src')).toEqual(["'self'"]);
    });

    /**
     * The editor writes its stylesheets at runtime, and a packaged window has to be able to
     * accept those sheets without accepting every inline sheet the renderer ever produces.
     */
    it('signs the styles of the run in production instead of opening them', () => {
        const policy = contentSecurityPolicy('production', NONCE);

        expect(directive(policy, 'style-src')).toEqual(["'self'", `'nonce-${NONCE}'`]);
    });

    /**
     * A nonce in the directive silences `'unsafe-inline'` for every browser that understands
     * it, and Vite serves its styles inline with no nonce to give. The dev policy stays as it
     * was, and the signed one is the one the user runs.
     */
    it('leaves the dev policy unsigned so the dev server keeps its styles', () => {
        expect(contentSecurityPolicy('development', NONCE)).not.toContain('nonce-');
    });

    it('opens inline styles for the dev server and nothing else', () => {
        const policy = contentSecurityPolicy('development', NONCE);

        expect(directive(policy, 'style-src')).toContain("'unsafe-inline'");
        expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'");
        expect(policy).not.toContain('unsafe-eval');
    });
});
