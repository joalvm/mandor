const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
];

/** How long ago something happened, in the reader's language and at the grain of a glance. */
export function relativeTime(at: number, now: number, language: string): string {
    const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    const elapsed = Math.max(0, now - at);
    const unit = UNITS.find(([, size]) => elapsed >= size);

    if (unit === undefined) {
        return format.format(0, 'second');
    }

    return format.format(-Math.floor(elapsed / unit[1]), unit[0]);
}
