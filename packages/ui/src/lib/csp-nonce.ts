/**
 * The nonce the window was served with, or nothing. Every style element written at runtime —
 * the colors of the editor, the scroll lock of an open menu — is signed with this: without the
 * signature the policy of a packaged window refuses the element, and it draws without its look.
 *
 * It is read from the document and not from the bridge on purpose: what the primitives of
 * `packages/ui` need is a property of the window they are drawn in, not something each app has
 * to hand them.
 */
export function cspNonce(): string {
    return document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ?? '';
}
