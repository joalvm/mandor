import { Icon, type IconName } from '@mandor/icons';
import {
    Collapsible,
    CollapsibleBody,
    CollapsibleHeader,
    RowLabel,
    Switch,
    Tree,
    TreeRow,
    type TreeLine,
} from '@mandor/ui';
import { useState } from 'react';

type Node = { children?: Node[]; glyph: IconName; name: string };

const COLLECTION: Node[] = [
    {
        children: [
            {
                children: [
                    { glyph: 'message', name: 'device-request' },
                    { glyph: 'message', name: 'device-ack' },
                    { glyph: 'message', name: 'device-status' },
                ],
                glyph: 'folder',
                name: 'eventos',
            },
            {
                children: [{ glyph: 'doc', name: 'gateway.asyncapi.yaml' }],
                glyph: 'folder',
                name: 'esquemas',
            },
            { glyph: 'connection', name: 'wss gateway.local' },
        ],
        glyph: 'folder',
        name: 'gateway-local',
    },
    {
        children: [{ glyph: 'message', name: 'device-request' }],
        glyph: 'folder',
        name: 'gateway-staging',
    },
    { glyph: 'doc', name: 'README' },
];

type Drawn = { glyph: IconName; line: TreeLine; name: string };

function walk(nodes: Node[], level: number, open: ReadonlySet<string>, into: Drawn[]): void {
    for (const node of nodes) {
        const expanded = node.children === undefined ? undefined : open.has(node.name);
        const nextLevel = level;

        into.push({ glyph: node.glyph, line: { expanded, id: node.name, level }, name: node.name });

        if (expanded === true && node.children !== undefined) {
            walk(node.children, nextLevel + 1, open, into);
        }
    }
}

/**
 * El árbol del lateral, como lo dibuja el producto: cabecera de sección clara, filas densas,
 * guías bajo el hueco del ancestro y, por defecto, ningún chevron — la única flecha es la de la
 * sección, y una carpeta se pliega donde se clicaa. Con `chevrons` cada carpeta lleva el suyo y la
 * guía nace debajo de él. El dueño guarda lo abierto y lo tomado.
 */
export function ExploradorDemo() {
    const [seccion, setSeccion] = useState(true);
    const [chevrons, setChevrons] = useState(false);
    const [open, setOpen] = useState<ReadonlySet<string>>(new Set(['gateway-local', 'eventos']));
    const [taken, setTaken] = useState<string[]>([]);
    const [said, setSaid] = useState('ninguna todavía');

    const drawn: Drawn[] = [];

    walk(COLLECTION, 1, open, drawn);

    const carpeta = (id: string): boolean =>
        drawn.some(({ line, name }) => name === id && line.expanded !== undefined);

    return (
        <div className="flex h-80 flex-col border border-border-subtle">
            <Collapsible onOpenChange={setSeccion} open={seccion}>
                <CollapsibleHeader title="Colecciones" />
                <CollapsibleBody>
                    <Tree
                        chevrons={chevrons}
                        label="Colecciones del workspace"
                        lines={drawn.map(({ line }) => line)}
                        onActivate={(id) => {
                            if (carpeta(id)) {
                                const abierta = open.has(id);
                                const next = new Set(open);

                                if (abierta) {
                                    next.delete(id);
                                } else {
                                    next.add(id);
                                }

                                setOpen(next);
                                setSaid(`${abierta ? 'plegar' : 'abrir'} ${id}`);

                                return;
                            }

                            setSaid(`activar ${id}`);
                        }}
                        onExpandedChange={(id, expanded) => {
                            const next = new Set(open);

                            if (expanded) {
                                next.add(id);
                            } else {
                                next.delete(id);
                            }

                            setOpen(next);
                        }}
                        onSelectedChange={setTaken}
                        selected={taken}
                    >
                        {drawn.map(({ glyph, name }) => (
                            <TreeRow key={name}>
                                <Icon name={glyph} size="sm" />
                                <RowLabel>{name}</RowLabel>
                            </TreeRow>
                        ))}
                    </Tree>
                </CollapsibleBody>
            </Collapsible>
            <div className="border-t border-border-subtle px-pad-panel py-1">
                <Switch
                    checked={chevrons}
                    label="Chevrones"
                    onCheckedChange={setChevrons}
                    withLabel
                />
            </div>
            <p className="border-t border-border-subtle px-pad-panel py-1 text-xs text-text-secondary">
                Última orden: {said} · Tomadas:{' '}
                {taken.length === 0 ? 'ninguna' : [...taken].join(', ')}
            </p>
        </div>
    );
}
