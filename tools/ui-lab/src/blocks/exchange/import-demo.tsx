import { DocIcon, ImportIcon } from '@mandor/icons';
import { Button, Dialog, DialogBody, DialogFooter, Switch } from '@mandor/ui';
import { useState } from 'react';

import { allLeavesOf } from './exchange-data.js';
import type { ChoiceNode } from './choice-model.js';
import { ExchangeTree } from './exchange-tree.js';

type ImportDemoProps = {
    file: string;
    formats: string;
    root: ChoiceNode;
};

/** Antes de elegir un archivo: dónde soltarlo o cómo buscarlo, y los formatos por su nombre. */
function Dropzone({ formats, onPick }: { formats: string; onPick: () => void }) {
    return (
        <div
            className="flex flex-col items-center gap-gap-control rounded-md border border-dashed border-border-strong bg-surface-raised p-pad-panel"
            data-part="import-dropzone"
        >
            <ImportIcon size="lg" />
            <span className="text-sm text-text-primary">Suelta un archivo aquí</span>
            <span className="text-xs text-text-secondary">{formats}</span>
            <Button onClick={onPick} variant="secondary">
                Elegir archivo
            </Button>
        </div>
    );
}

/** Con el archivo leído: su nombre sobre la ficha del documento y la salida para cambiarlo. */
function Loaded({ file, onPick }: { file: string; onPick: () => void }) {
    return (
        <div
            className="flex h-header items-center gap-gap-control rounded-md border border-border-subtle bg-surface-raised px-pad-panel"
            data-part="import-file"
        >
            <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-accent-tint text-text-accent"
            >
                <DocIcon size="md" />
            </span>
            <span className="mr-auto min-w-0 truncate text-sm text-text-primary">{file}</span>
            <Button onClick={onPick} size="sm" variant="secondary">
                Elegir otro
            </Button>
        </div>
    );
}

/**
 * La ventana de importar en sus dos tiempos: el archivo por elegir y el archivo leído. El pie
 * lleva una sola respuesta; no hay formato que decidir, lo dice el archivo.
 */
export function ImportDemo({ file, formats, root }: ImportDemoProps) {
    const [open, setOpen] = useState(false);
    const [chevrons, setChevrons] = useState(true);
    const [read, setRead] = useState(false);
    const [chosen, setChosen] = useState<Set<string>>(() => allLeavesOf(root));

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Switch checked={chevrons} label="Chevrones" onCheckedChange={setChevrons} withLabel />
            <Button
                onClick={() => {
                    setRead(false);
                    setOpen(true);
                }}
                variant="secondary"
            >
                Importar
            </Button>
            {/* modal-policy: short-config-form — un archivo que traer y qué dejar entrar. */}
            <Dialog closeLabel="Cerrar" onOpenChange={setOpen} open={open} title="Importar">
                <DialogBody>
                    <div className="flex flex-col gap-gap-section">
                        {read ? (
                            <>
                                <Loaded
                                    file={file}
                                    onPick={() => {
                                        setRead(false);
                                    }}
                                />
                                <ExchangeTree
                                    chevrons={chevrons}
                                    chosen={chosen}
                                    label="Qué importar"
                                    onChange={setChosen}
                                    root={root}
                                />
                            </>
                        ) : (
                            <Dropzone
                                formats={formats}
                                onPick={() => {
                                    setRead(true);
                                }}
                            />
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button
                        disabled={!read || chosen.size === 0}
                        onClick={() => {
                            setOpen(false);
                        }}
                        variant="primary"
                    >
                        Importar
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
