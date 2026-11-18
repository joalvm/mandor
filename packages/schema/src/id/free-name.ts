/**
 * The name a new thing is born with: the word that says what it is, or that word with the first
 * number no sibling wears yet. Names are told apart regardless of case, the way the disk tells
 * apart the files they become.
 */
export function freeName(base: string, taken: readonly string[]): string {
    const occupied = new Set(taken.map(folded));

    if (!occupied.has(folded(base))) {
        return base;
    }

    let counter = 2;

    while (occupied.has(folded(numbered(base, counter)))) {
        counter += 1;
    }

    return numbered(base, counter);
}

function folded(name: string): string {
    return name.trim().toLowerCase();
}

function numbered(base: string, counter: number): string {
    return `${base} ${String(counter)}`;
}
