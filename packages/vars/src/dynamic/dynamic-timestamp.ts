/** Seconds since the Unix epoch, as an integer, for `{{$timestamp}}`. */
export function dynamicTimestamp(): string {
    return String(Math.floor(Date.now() / 1000));
}
