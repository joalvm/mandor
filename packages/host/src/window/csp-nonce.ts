import { randomBytes } from 'node:crypto';

/** Sixteen bytes: what a nonce needs so guessing it is not a strategy. */
const NONCE_BYTES = 16;

/**
 * The value the policy of one run signs its inline styles with. One per boot and not one per
 * response: the renderer reads it once from the document it was served, and a value that
 * changed underneath would leave every later stylesheet unsigned.
 *
 * It is what lets the editor keep `style-src 'self'` in production. The editor writes its
 * rules into `<style>` elements it creates at runtime, and the only alternatives the policy
 * offers are a hash of something generated —there is none— or `'unsafe-inline'`, which opens
 * the directive to anything the window ever renders.
 */
export function createCspNonce(): string {
    return randomBytes(NONCE_BYTES).toString('base64');
}
