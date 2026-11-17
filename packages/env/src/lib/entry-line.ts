/** A line of an entry editor, on or off. An off line is kept, not sent. */
export type EntryLine = {
    disabled: boolean;
    id: string;
    name: string;
    value: string;
};

/** The id the next line takes: one more than the highest numeric id, like every list here. */
export function nextLineId(lines: readonly Pick<EntryLine, 'id'>[]): string {
    const taken = lines.map((line) => Number(line.id)).filter((id) => Number.isSafeInteger(id));

    return String(Math.max(-1, ...taken) + 1);
}

/** The lines with one more at the end, under an identity none of the others holds. */
export function withNewLine(lines: readonly EntryLine[]): EntryLine[] {
    return [...lines, { disabled: false, id: nextLineId(lines), name: '', value: '' }];
}
