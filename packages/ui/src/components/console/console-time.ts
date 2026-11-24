function padded(value: number, width: number): string {
    return String(value).padStart(width, '0');
}

/** When an entry was written, as a browser console stamps it: `14:03:07.250`, in local time. */
export function consoleTime(at: number): string {
    const date = new Date(at);

    return [
        padded(date.getHours(), 2),
        ':',
        padded(date.getMinutes(), 2),
        ':',
        padded(date.getSeconds(), 2),
        '.',
        padded(date.getMilliseconds(), 3),
    ].join('');
}
