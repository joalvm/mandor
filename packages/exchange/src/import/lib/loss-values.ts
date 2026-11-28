/**
 * The values a loss fills its words with, as the words take them. A loss travels as text from
 * main, but a count has to be a number for the message to pick the plural form of its language:
 * `3 more entries` in English is `3 записи` and `5 записей` in Russian.
 */
export function lossValues(
    values: Readonly<Record<string, string>>,
): Readonly<Record<string, number | string>> {
    const count = values['count'];

    if (count === undefined) {
        return values;
    }

    return { ...values, count: Number(count) };
}
