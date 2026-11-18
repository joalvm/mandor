/** A `reloadWhen` for a test that never writes connections behind the list's back. */
export function reloadNever(): () => void {
    return () => undefined;
}
