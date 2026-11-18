/** An optional field of a level left empty is not written: the file says only what was given. */
export function emptyAsAbsent(text: string): string | undefined {
    return text === '' ? undefined : text;
}
