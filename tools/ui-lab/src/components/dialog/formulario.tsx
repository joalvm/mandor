import { Button, Dialog, DialogBody, DialogFooter, Field, Input } from '@mandor/ui';
import { useState } from 'react';

/**
 * El formulario corto de configuración: dos campos y las dos respuestas al pie. El ancho no
 * se elige: 520, el del formulario, lo pone lo que el diálogo contiene.
 */
export function FormularioDemo() {
    const [open, setOpen] = useState(false);
    const [nombre, setNombre] = useState('');
    const [url, setUrl] = useState('');

    function cerrar(): void {
        setOpen(false);
        setNombre('');
        setUrl('');
    }

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Button
                variant="secondary"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Nueva conexión
            </Button>
            {/* modal-policy: short-config-form — un nombre y una dirección, y nada más. */}
            <Dialog
                closeLabel="Cerrar"
                onOpenChange={(next) => {
                    if (!next) {
                        cerrar();
                    }
                }}
                open={open}
                title="Nueva conexión"
            >
                <DialogBody>
                    <div className="flex flex-col gap-gap-control">
                        <Field id="lab-conexion-nombre" label="Nombre">
                            <Input
                                label="Nombre"
                                onValueChange={setNombre}
                                value={nombre}
                                variant="text"
                            />
                        </Field>
                        <Field id="lab-conexion-url" label="Dirección">
                            <Input label="Dirección" onValueChange={setUrl} value={url} />
                        </Field>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={cerrar} variant="secondary">
                        Cancelar
                    </Button>
                    <Button disabled={nombre.trim() === '' || url.trim() === ''} onClick={cerrar}>
                        Guardar
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
