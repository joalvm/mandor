import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@mandor/ui';
import { useState } from 'react';

/**
 * La superficie de la demo es una línea del editor. Click derecho la abre donde cayó el
 * puntero: texto solo, sin columnas, con la apagada diciendo su motivo.
 */
export function EditorDemo() {
    const [dicho, setDicho] = useState('—');

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <ContextMenu>
                <ContextMenuTrigger>
                    <div className="flex h-header w-full items-center rounded-md border border-border-subtle bg-surface-control px-2 font-mono text-xs text-text-primary">
                        GET https://gateway.local/v1/events
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem
                        onSelect={() => {
                            setDicho('Copiar');
                        }}
                    >
                        Copiar
                    </ContextMenuItem>
                    <ContextMenuItem
                        disabled
                        disabledReason="El portapapeles está vacío"
                        onSelect={() => {
                            setDicho('Pegar');
                        }}
                    >
                        Pegar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onSelect={() => {
                            setDicho('Eliminar…');
                        }}
                    >
                        Eliminar…
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            <p className="text-xs text-text-secondary">Última orden: {dicho}</p>
        </div>
    );
}
