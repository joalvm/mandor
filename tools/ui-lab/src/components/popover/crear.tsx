import { Button, Field, Input, Popover, PopoverPanel, PopoverTrigger } from '@mandor/ui';
import { useState } from 'react';

/**
 * El formulario corto que sustituye al modal: un campo y dos respuestas. El foco entra al
 * primer campo y queda dentro mientras está abierto; Esc y el clic fuera lo cierran.
 */
export function CrearDemo() {
    const [open, setOpen] = useState(false);
    const [nombre, setNombre] = useState('');

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Popover onOpenChange={setOpen} open={open}>
                <PopoverTrigger>
                    <Button variant="secondary">Crear workspace</Button>
                </PopoverTrigger>
                <PopoverPanel label="Crear workspace">
                    <div className="flex flex-col gap-gap-group">
                        <Field id="lab-crear-nombre" label="Nombre">
                            <Input
                                label="Nombre"
                                onValueChange={setNombre}
                                value={nombre}
                                variant="text"
                            />
                        </Field>
                        <div className="flex justify-end gap-gap-control">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setOpen(false);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                disabled={nombre.trim() === ''}
                                size="sm"
                                onClick={() => {
                                    setOpen(false);
                                }}
                            >
                                Crear
                            </Button>
                        </div>
                    </div>
                </PopoverPanel>
            </Popover>
            <p className="text-xs text-text-secondary">
                Esc y el clic fuera cierran; el foco vuelve al botón que lo abrió.
            </p>
        </div>
    );
}
