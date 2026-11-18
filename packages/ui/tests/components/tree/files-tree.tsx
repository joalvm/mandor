import { act, screen } from '@testing-library/react';
import { useState } from 'react';

import { RowLabel, Tree, TreeRow, type TreeLine } from '../../../src/index.js';
import { rowName } from '../../../src/testing/by-part.js';

type File = { folder?: boolean; id: string; level: number; name: string };

/** Two folders with two lines and one line inside, and a leaf at the root. */
const FILES: readonly File[] = [
    { folder: true, id: 'orders', level: 1, name: 'orders' },
    { id: 'orders/created', level: 2, name: 'created' },
    { id: 'orders/paid', level: 2, name: 'paid' },
    { folder: true, id: 'users', level: 1, name: 'users' },
    { id: 'users/signed-up', level: 2, name: 'signed-up' },
    { id: 'readme', level: 1, name: 'readme' },
];

function linesOf(folded: readonly string[]): (TreeLine & { name: string })[] {
    return FILES.filter((file) => !folded.some((folder) => file.id.startsWith(`${folder}/`))).map(
        (file) => ({
            expanded: file.folder === true ? !folded.includes(file.id) : undefined,
            id: file.id,
            level: file.level,
            name: file.name,
        }),
    );
}

type FilesTreeProps = {
    chevrons?: boolean | undefined;
    onActivate?: ((id: string) => void) | undefined;
    onDelete?: ((ids: string[]) => void) | undefined;
    onRevealed?: (() => void) | undefined;
    revealed?: string | null | undefined;
    selectable?: boolean | undefined;
    selected?: string[] | undefined;
};

/** A tree that keeps its folds and its selection the way a feature would: in its own state. */
export function FilesTree({
    chevrons,
    onActivate,
    onDelete,
    onRevealed,
    revealed,
    selectable = true,
    selected: initial = [],
}: FilesTreeProps) {
    const [folded, setFolded] = useState<string[]>([]);
    const [selected, setSelected] = useState(initial);
    const lines = linesOf(folded);

    return (
        <Tree
            chevrons={chevrons}
            label="Archivos"
            lines={lines}
            onActivate={onActivate}
            onDelete={onDelete}
            onExpandedChange={(id, expanded) => {
                setFolded((current) =>
                    expanded ? current.filter((folder) => folder !== id) : [...current, id],
                );
            }}
            onRevealed={onRevealed}
            onSelectedChange={selectable ? setSelected : undefined}
            revealed={revealed}
            selected={selectable ? selected : undefined}
        >
            {lines.map((line) => (
                <TreeRow key={line.id}>
                    <RowLabel>{line.name}</RowLabel>
                </TreeRow>
            ))}
        </Tree>
    );
}

export function row(name: string): HTMLElement {
    return screen.getByRole('treeitem', { name });
}

export function selectedNames(): string[] {
    return screen
        .getAllByRole('treeitem')
        .filter((line) => line.getAttribute('aria-selected') === 'true')
        .map((line) => rowName(line));
}

/** The tree writes down where the focus went, so the move is a React update like any other. */
export function focusedOn(name: string): void {
    act(() => {
        row(name).focus();
    });
}
