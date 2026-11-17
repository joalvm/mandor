import { FolderIcon, Icon } from '@mandor/icons';
import { Checkbox, IconButton, MethodMark, RowLabel, SearchInput, Tree, TreeRow } from '@mandor/ui';
import { useState, type PropsWithChildren } from 'react';

import { CHECKED, drawn, foldersOf, markOf, toggled, type ChoiceNode } from './choice-model.js';

type NodeGlyphProps = { node: ChoiceNode };

/** Lo que dice qué es el nodo: el verbo donde el lateral lo pone, o su glifo. */
function NodeGlyph({ node }: NodeGlyphProps) {
    if (node.method !== undefined) {
        return (
            <span className="flex w-10 shrink-0 items-center justify-end">
                <MethodMark compact method={node.method} />
            </span>
        );
    }

    return node.glyph === undefined ? (
        <FolderIcon size="sm" />
    ) : (
        <Icon name={node.glyph} size="sm" />
    );
}

type ExchangeTreeProps = PropsWithChildren<{
    /** Dibuja el chevron de cada carpeta en el hueco que la fila ya reserva. */
    chevrons: boolean;
    chosen: ReadonlySet<string>;
    label: string;
    onChange: (chosen: Set<string>) => void;
    root: ChoiceNode;
}>;

/**
 * El árbol de lo que se elige: el `Tree` de la ventana con una casilla por nodo. Arriba, una sola
 * línea: lo que el dueño ponga a la izquierda —el formato— y, a la derecha, el filtro y un botón
 * que pliega o despliega todo; entre los dos, el hueco. Pulsar una carpeta la pliega, como en el
 * lateral; la casilla es lo que elige. El alto es fijo: plegar o filtrar no mueve la ventana. El
 * dueño guarda lo elegido; el árbol, lo plegado.
 */
export function ExchangeTree({
    chevrons,
    children,
    chosen,
    label,
    onChange,
    root,
}: ExchangeTreeProps) {
    const [needle, setNeedle] = useState('');
    const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
    const lines = drawn([root], 1, folded).filter(
        ({ node }) =>
            node.children !== undefined || node.name.toLowerCase().includes(needle.toLowerCase()),
    );
    const everyFolder = foldersOf(root.children ?? []);
    const allFolded = everyFolder.every((id) => folded.has(id));

    function fold(id: string, expanded: boolean): void {
        const next = new Set(folded);

        if (expanded) {
            next.delete(id);
        } else {
            next.add(id);
        }

        setFolded(next);
    }

    return (
        <div className="flex min-h-0 flex-col gap-gap-group" data-part="exchange-tree">
            <div className="flex items-center justify-between gap-gap-group">
                {children}
                <div
                    className={
                        children === undefined
                            ? 'flex min-w-0 flex-1 items-center gap-gap-control'
                            : 'ml-auto flex items-center gap-gap-control'
                    }
                >
                    <SearchInput
                        className={children === undefined ? 'min-w-0 flex-1' : 'w-48'}
                        label="Filtrar"
                        onValueChange={setNeedle}
                        placeholder="Filtrar"
                        value={needle}
                    />
                    <IconButton
                        icon={allFolded ? 'unfold' : 'fold'}
                        label={allFolded ? 'Desplegar todo' : 'Plegar todo'}
                        onClick={() => {
                            setFolded(allFolded ? new Set() : new Set(everyFolder));
                        }}
                        size="sm"
                    />
                </div>
            </div>
            <div className="box-content flex h-96 flex-col rounded-md border border-border-subtle bg-surface-panel p-2">
                <Tree
                    chevrons={chevrons}
                    label={label}
                    lines={lines.map(({ line }) => line)}
                    onActivate={(id) => {
                        const found = lines.find(({ line }) => line.id === id);

                        if (found?.node.children === undefined && found !== undefined) {
                            onChange(toggled(found.node, chosen));
                        } else if (found !== undefined) {
                            fold(id, found.line.expanded !== true);
                        }
                    }}
                    onExpandedChange={fold}
                >
                    {lines.map(({ line, node }) => (
                        <TreeRow key={line.id}>
                            <Checkbox
                                checked={CHECKED[markOf(node, chosen)]}
                                label={node.name}
                                onCheckedChange={() => {
                                    onChange(toggled(node, chosen));
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                }}
                            />
                            <NodeGlyph node={node} />
                            <RowLabel>{node.name}</RowLabel>
                        </TreeRow>
                    ))}
                </Tree>
            </div>
        </div>
    );
}
