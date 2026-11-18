/** Two commands asking for the same keys, named both, because either one could be the mistake. */
export class ShortcutConflictError extends Error {
    constructor(combination: string, one: string, other: string) {
        super(`Two commands share the shortcut ${combination}: ${one} and ${other}`);
        this.name = 'ShortcutConflictError';
    }
}
