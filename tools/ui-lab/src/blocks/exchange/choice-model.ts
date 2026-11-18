import type { IconName } from '@mandor/icons';
import type { TreeLine } from '@mandor/ui';

/** Un nodo de lo que se elige: una carpeta lleva hijos; una hoja, su verbo o su glifo. */
export type ChoiceNode = {
    children?: ChoiceNode[];
    glyph?: IconName;
    id: string;
    method?: string;
    name: string;
};

/** Cómo marca la casilla de un nodo: todas sus hojas, ninguna o solo algunas. */
export const CHECKED = { checked: true, mixed: 'indeterminate', unchecked: false } as const;

function leavesOf(node: ChoiceNode): string[] {
    if (node.children === undefined) {
        return [node.id];
    }

    return node.children.flatMap(leavesOf);
}

export function markOf(node: ChoiceNode, chosen: ReadonlySet<string>): keyof typeof CHECKED {
    const leaves = leavesOf(node);
    const taken = leaves.filter((id) => chosen.has(id));

    if (taken.length === 0) {
        return 'unchecked';
    }

    return taken.length === leaves.length ? 'checked' : 'mixed';
}

/** Marca todas las hojas del nodo, o las suelta si ya estaban todas. */
export function toggled(node: ChoiceNode, chosen: ReadonlySet<string>): Set<string> {
    const next = new Set(chosen);
    const all = markOf(node, chosen) === 'checked';

    for (const id of leavesOf(node)) {
        if (all) {
            next.delete(id);
        } else {
            next.add(id);
        }
    }

    return next;
}

export function foldersOf(nodes: readonly ChoiceNode[]): string[] {
    return nodes.flatMap((node) =>
        node.children === undefined ? [] : [node.id, ...foldersOf(node.children)],
    );
}

export type Drawn = { line: TreeLine; node: ChoiceNode };

/** Las líneas a la vista, planas y en orden, sin los hijos de una carpeta plegada. */
export function drawn(
    nodes: readonly ChoiceNode[],
    level: number,
    folded: ReadonlySet<string>,
): Drawn[] {
    return nodes.flatMap((node) => {
        const open = node.children === undefined ? undefined : !folded.has(node.id);
        const own: Drawn = { line: { expanded: open, id: node.id, level }, node };

        return open === true && node.children !== undefined
            ? [own, ...drawn(node.children, level + 1, folded)]
            : [own];
    });
}
