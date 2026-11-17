// A Map, not an object: the key is whatever was pressed, and no name an object answers to moves.
const MOVES: ReadonlyMap<string, (current: number, total: number) => number> = new Map([
    ['ArrowDown', (current: number, total: number) => (current + 1) % total],
    ['ArrowUp', (current: number, total: number) => (current - 1 + total) % total],
    ['End', (_current: number, total: number) => total - 1],
    ['Home', () => 0],
]);

/**
 * Where the highlight lands for a key that moves it, or nothing for a key that does not.
 *
 * The ends of the list join, so holding a direction never dead-ends against a border the reader
 * cannot see.
 */
export function nextHighlight(key: string, current: number, total: number): number | null {
    const move = MOVES.get(key);

    if (move === undefined || total === 0) {
        return null;
    }

    return move(current, total);
}
