/** The least a fluid column narrows to, however narrow the table: past it, the table scrolls. */
type TableColumnMin = 'lg' | 'md' | 'sm';

/** What a fixed column holds: the box that ticks a row, or the handle that carries it. */
type TableColumnFixed = 'check' | 'handle';

/**
 * One track of a table. A fixed one is as wide as the control it holds; a fluid one shares
 * what is left of the width by its weight and never narrows past its least.
 */
export type TableColumn =
    | { id: string; kind: 'fixed'; size: TableColumnFixed }
    | { id: string; kind: 'fluid'; min: TableColumnMin; weight: number };

type FluidColumn = Extract<TableColumn, { kind: 'fluid' }>;

/** The share each fluid column was dragged to, by id; one not in it keeps the weight it starts with. */
export type TableWeights = Readonly<Record<string, number>>;

/** A drag on the right edge of a column: how far it went, and how wide the column stood. */
export type TableDrag = { deltaX: number; id: string; width: number };

const FIXED_TRACK: Readonly<Record<TableColumnFixed, string>> = {
    check: 'calc(var(--mandor-height-field) - 2 * var(--mandor-gap-tight))',
    handle: 'var(--mandor-icon-md)',
};

const MIN_TRACK: Readonly<Record<TableColumnMin, string>> = {
    lg: '12rem',
    md: '9rem',
    sm: '6rem',
};

/** The room the name of the last column keeps beside the tools of the head laid over its end. */
const NAME_ROOM = '4rem';

/** The narrowest share a drag leaves a column: thin, but still there to drag back. */
const LEAST_WEIGHT = 0.2;

function weightOf(column: FluidColumn, weights: TableWeights): number {
    return weights[column.id] ?? column.weight;
}

function fluidTrack(least: string, column: FluidColumn, weights: TableWeights): string {
    return `minmax(${least}, ${String(weightOf(column, weights))}fr)`;
}

function trackOf(column: TableColumn, weights: TableWeights): string {
    if (column.kind === 'fixed') {
        return FIXED_TRACK[column.size];
    }

    return fluidTrack(MIN_TRACK[column.min], column, weights);
}

/**
 * The last track never narrows past the tools of the head and the name beside them: the tools
 * lie over its end, and a column narrower than them would hand them the one before it.
 */
function lastTrackOf(column: TableColumn, weights: TableWeights): string {
    if (column.kind === 'fixed') {
        return FIXED_TRACK[column.size];
    }

    const least = `max(${MIN_TRACK[column.min]}, calc(var(--table-tools-width, 0px) + ${NAME_ROOM}))`;

    return fluidTrack(least, column, weights);
}

/** The tracks of the grid the head and every row lay their cells on, as the stylesheet reads them. */
export function tableTemplateOf(columns: readonly TableColumn[], weights: TableWeights): string {
    const last = columns.at(-1);
    const tracks = columns.slice(0, -1).map((column) => trackOf(column, weights));

    if (last === undefined) {
        return '';
    }

    return [...tracks, lastTrackOf(last, weights)].join(' ');
}

/** The two columns an edge stands between, when both share by weight; a fixed one has no edge. */
function edgeOf(
    columns: readonly TableColumn[],
    id: string,
): { left: FluidColumn; right: FluidColumn } | undefined {
    const at = columns.findIndex((column) => column.id === id);
    const left = columns[at];
    const right = columns[at + 1];

    if (left?.kind !== 'fluid' || right?.kind !== 'fluid') {
        return undefined;
    }

    return { left, right };
}

/** Whether the right edge of a column can be dragged: only between two columns that share by weight. */
export function resizableColumn(columns: readonly TableColumn[], id: string): boolean {
    return edgeOf(columns, id) !== undefined;
}

/**
 * The weights after the edge between a column and the next one moves. What one side gains the
 * other loses, so every other column, and the table, stays as wide as it was. The pixels of the
 * drag turn into weight by how wide the column stands on the weight it has.
 */
export function resizedWeights(
    columns: readonly TableColumn[],
    weights: TableWeights,
    { deltaX, id, width }: TableDrag,
): TableWeights {
    const edge = edgeOf(columns, id);

    if (edge === undefined || width === 0) {
        return weights;
    }

    const left = weightOf(edge.left, weights);
    const right = weightOf(edge.right, weights);
    const share = (deltaX * left) / width;
    const moved = Math.min(right - LEAST_WEIGHT, Math.max(LEAST_WEIGHT - left, share));

    return { ...weights, [edge.left.id]: left + moved, [edge.right.id]: right - moved };
}
