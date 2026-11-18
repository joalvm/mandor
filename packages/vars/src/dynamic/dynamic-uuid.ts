/**
 * A fresh UUID v4 for `{{$uuid}}`, from the runtime crypto: no dependency, and it works
 * in Node, in `main` and in the renderer alike.
 */
export function dynamicUuid(): string {
    return globalThis.crypto.randomUUID();
}
