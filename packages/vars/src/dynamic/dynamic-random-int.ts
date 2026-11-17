/**
 * Range of `{{$randomInt}}`: an integer from 0 to 1000, both included. Same range as
 * Postman, so a migrated collection keeps its expectations.
 */
const RANDOM_INT_MIN = 0;
const RANDOM_INT_MAX = 1000;

/** A random integer inside the documented range, from the runtime crypto. */
export function dynamicRandomInt(): string {
    const buffer = new Uint32Array(1);

    globalThis.crypto.getRandomValues(buffer);

    // DataView reads a `number`, never `undefined`: no dead branch to satisfy the index check.
    const view = new DataView(buffer.buffer);
    const span = RANDOM_INT_MAX - RANDOM_INT_MIN + 1;

    return String(RANDOM_INT_MIN + Math.floor((view.getUint32(0) / 2 ** 32) * span));
}
