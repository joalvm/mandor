const TIME_FORMATS = new Map<string, Intl.DateTimeFormat>();

/**
 * Timeline rows show hours, minutes and seconds in the way the language writes them, fixed at 24
 * hours so an afternoon never turns into a PM that moves the column.
 */
export function formatActivityTime(at: number, language: string): string {
    let format = TIME_FORMATS.get(language);

    if (format === undefined) {
        format = new Intl.DateTimeFormat(language, {
            hour: '2-digit',
            hourCycle: 'h23',
            minute: '2-digit',
            second: '2-digit',
        });
        TIME_FORMATS.set(language, format);
    }

    return format.format(at);
}
