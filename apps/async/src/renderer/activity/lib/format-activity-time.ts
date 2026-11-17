const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
});

/** Timeline rows show HH:MM:SS, fixed 24h so the column never trembles. */
export function formatActivityTime(at: number): string {
    return TIME_FORMAT.format(at);
}
