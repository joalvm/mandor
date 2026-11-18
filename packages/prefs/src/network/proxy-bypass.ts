/** The bypass as it is typed: `a.test, *.local`; the list is what the commas leave. */
export function bypassOf(typed: string): string[] {
    return typed
        .split(',')
        .map((host) => host.trim())
        .filter((host) => host !== '');
}
