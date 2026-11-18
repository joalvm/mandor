/** An entry of a list holding options of its own: a group, whatever else it carries. */
type Grouping = { options: readonly unknown[] };

/** An entry of a list as far as choosing reads it: one value, or a group of them. */
type Entry<V extends string> = { value: V } | { options: readonly { value: V }[] };

/** Whether an entry of a list is a group of options rather than one option. */
export function isOptionGroup<E extends object>(entry: E): entry is Extract<E, Grouping> {
    return 'options' in entry;
}

type Labelled = { label: string };

/**
 * Every text the trigger of a list can show, once each and in the order the list reads: the
 * placeholder, then the lines. Group names never stand in the trigger, so they are not counted.
 */
export function shownLinesOf(
    entries: readonly (Labelled | { options: readonly Labelled[] })[],
    placeholder: string | undefined,
): string[] {
    const lines = entries.flatMap((entry) => (isOptionGroup(entry) ? entry.options : [entry]));
    const first = placeholder === undefined ? [] : [placeholder];

    return [...new Set([...first, ...lines.map((line) => line.label)])];
}

/** The option the list answered with, as the caller typed it: the list only speaks text. */
export function chosenOf<V extends string>(
    entries: readonly Entry<V>[],
    value: string,
): V | undefined {
    return entries
        .flatMap((entry) => (isOptionGroup(entry) ? entry.options : [entry]))
        .find((option) => option.value === value)?.value;
}
