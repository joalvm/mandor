import { Button, Dialog, DialogBody, DialogFooter, Switch } from '@mandor/ui';
import { useState } from 'react';

import { allLeavesOf } from './exchange-data.js';
import type { ChoiceNode } from './choice-model.js';
import { ExchangeTree } from './exchange-tree.js';
import { FormatMenu } from './format-menu.js';

type Format = { label: string; value: string };

type ExportDemoProps = {
    formats: readonly Format[];
    root: ChoiceNode;
};

/**
 * La ventana de exportar: el formato a la izquierda de la línea del filtro, de ancho fijo y como
 * lista desplegable, y debajo solo lo que se elige. Sin cuentas ni descripciones.
 */
export function ExportDemo({ formats, root }: ExportDemoProps) {
    const [open, setOpen] = useState(false);
    const [chevrons, setChevrons] = useState(true);
    const [format, setFormat] = useState(formats[0]?.value);
    const [chosen, setChosen] = useState<Set<string>>(() => allLeavesOf(root));

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Switch checked={chevrons} label="Chevrones" onCheckedChange={setChevrons} withLabel />
            <Button
                onClick={() => {
                    setOpen(true);
                }}
                variant="secondary"
            >
                Exportar
            </Button>
            {/* modal-policy: short-config-form — un árbol que elegir y un formato, y nada más. */}
            <Dialog closeLabel="Cerrar" onOpenChange={setOpen} open={open} title="Exportar">
                <DialogBody>
                    <ExchangeTree
                        chevrons={chevrons}
                        chosen={chosen}
                        label="Qué exportar"
                        onChange={setChosen}
                        root={root}
                    >
                        <FormatMenu formats={formats} onChange={setFormat} value={format} />
                    </ExchangeTree>
                </DialogBody>
                <DialogFooter>
                    <Button
                        disabled={chosen.size === 0}
                        onClick={() => {
                            setOpen(false);
                        }}
                        variant="primary"
                    >
                        Exportar
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
