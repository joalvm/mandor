const FORMATS = new Map<string, Intl.NumberFormat>();

/**
 * A number the way the language writes it: its decimal mark, its digits, and its grouping, which
 * starts at five digits so a size of `1023` stays as short as it is. As many decimals as asked
 * for, at least `fewest`: a fixed count keeps a column of sizes from trembling.
 */
export function formatNumber(value: number, language: string, most = 0, fewest = most): string {
    const key = `${language} ${String(most)} ${String(fewest)}`;
    let format = FORMATS.get(key);

    if (format === undefined) {
        format = new Intl.NumberFormat(language, {
            maximumFractionDigits: most,
            minimumFractionDigits: fewest,
            useGrouping: 'min2',
        });
        FORMATS.set(key, format);
    }

    return format.format(value);
}
