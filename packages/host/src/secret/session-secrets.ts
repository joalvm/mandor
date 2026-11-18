/**
 * The secret values resolved in this session, kept in main and nowhere else. Every edge that
 * writes outside the process reads this list before writing, which is why it does not cross
 * the bridge: a renderer that could ask for it would be a renderer that can leak it.
 *
 * Module state, like the active origin: one process, one session, one set of secrets.
 */
let resolved: string[] = [];

/** Adds what a resolution found. A value already held is not held twice. */
export function rememberSessionSecrets(values: readonly string[]): void {
    for (const value of values) {
        if (!resolved.includes(value)) {
            resolved.push(value);
        }
    }
}

/** What every edge of this process has to hide before writing. */
export function sessionSecrets(): readonly string[] {
    return resolved;
}

export function forgetSessionSecrets(): void {
    resolved = [];
}
