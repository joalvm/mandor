import { useState } from 'react';

import { Button } from '@mandor/ui';

/**
 * Cada duración con la interacción real que le toca, repetible: la rápida se juega al pasar el
 * puntero sobre un control de verdad; las otras dos, con su botón.
 */
export function TransicionesDemo() {
    const [chipOpen, setChipOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);

    return (
        <div className="flex flex-col gap-gap-group">
            <p className="text-xs text-text-secondary">
                La rápida se juega al pasar el puntero sobre el botón; las otras dos, con su botón,
                cuantas veces haga falta.
            </p>
            <div className="flex items-center gap-gap-group">
                <div className="w-56 shrink-0">
                    <code className="whitespace-nowrap font-mono text-2xs">duration-fast</code>
                    <p className="text-xs text-text-secondary">80 ms — el hover del control</p>
                </div>
                <Button variant="secondary">Pasa el puntero</Button>
            </div>
            <div className="flex items-center gap-gap-group">
                <div className="w-56 shrink-0">
                    <code className="whitespace-nowrap font-mono text-2xs">duration-base</code>
                    <p className="text-xs text-text-secondary">
                        120 ms — lo que se abre y se cierra
                    </p>
                </div>
                <div className="relative">
                    <Button
                        aria-expanded={chipOpen}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                            setChipOpen(!chipOpen);
                        }}
                    >
                        Abrir
                    </Button>
                    <span
                        aria-hidden="true"
                        className={`absolute left-full top-1/2 ml-gap-control -translate-y-1/2 whitespace-nowrap rounded-md border border-border-subtle bg-surface-raised px-pad-control py-gap-tight text-xs text-text-primary transition-all duration-base ease-out ${
                            chipOpen ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'
                        }`}
                    >
                        el pop, entrando
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-gap-group">
                <div className="w-56 shrink-0">
                    <code className="whitespace-nowrap font-mono text-2xs">duration-slow</code>
                    <p className="text-xs text-text-secondary">200 ms — lo que viaja: el panel</p>
                </div>
                <div className="flex-1">
                    <Button
                        aria-expanded={panelOpen}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setPanelOpen(!panelOpen);
                        }}
                    >
                        {panelOpen ? 'Plegar' : 'Desplegar'}
                    </Button>
                    <div
                        className={`grid transition-all duration-slow ease-out ${
                            panelOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div className="mt-gap-control max-w-sm rounded-md border border-border-subtle bg-surface-panel p-pad-panel text-xs text-text-secondary">
                                El panel se despliega con duration-slow: lo que viaja se toma su
                                tiempo, y ninguna otra pieza de la interfaz se mueve con él.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
