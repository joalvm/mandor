const ITEM = /^(\s*)([-*+]|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?(.*)$/;

const LINE_BREAK = '\n';

/**
 * What Enter types at a place in a line of markdown, or `null` where it ends a list instead.
 *
 * Inside a list it goes on with it, the way GitHub's editor and VS Code do: the bullet repeats,
 * the number goes up and a task comes back unticked. On an item with nothing in it, it takes the
 * bullet away and the list is over. Anywhere before the bullet, or outside a list, it is a plain
 * line break.
 *
 * `column` is the editor's, counted from 1.
 */
export function enterInList(line: string, column: number): string | null {
    const item = itemOf(line);

    if (item === null || column <= item.indent.length + 1) {
        return LINE_BREAK;
    }

    if (item.text.trim() === '') {
        return null;
    }

    return `${LINE_BREAK}${item.indent}${item.next}${item.space}${item.task ? '[ ] ' : ''}`;
}

type ListItem = { indent: string; next: string; space: string; task: boolean; text: string };

/** The parts of an item of a list, with the marker of the item after it; `null` off a list. */
function itemOf(line: string): ListItem | null {
    const item = ITEM.exec(line);

    if (item === null) {
        return null;
    }

    const [, indent = '', bullet = '', number, close = '.', space = ' ', task, text = ''] = item;
    const next = number === undefined ? bullet : `${String(Number(number) + 1)}${close}`;

    return { indent, next, space, task: task !== undefined, text };
}
