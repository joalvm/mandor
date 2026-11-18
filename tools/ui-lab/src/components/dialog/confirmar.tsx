import { Button, ConfirmDialog } from '@mandor/ui';
import { useState } from 'react';

/**
 * La confirmación irreversible: el título nombra el objeto exacto, el cuerpo dice qué se
 * pierde, y el nombre escrito es lo que desbloquea el verbo. El foco empieza en Conservar.
 */
export function ConfirmarDemo() {
    const [open, setOpen] = useState(false);
    const [fin, setFin] = useState('sin respuesta');

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Button
                variant="secondary"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Borrar conexión…
            </Button>
            {/* modal-policy: irreversible-confirmation */}
            <ConfirmDialog
                cancelLabel="Conservar"
                confirmLabel="Borrar"
                confirmationName="gateway-local"
                description="Se borra la conexión y su actividad. No se puede deshacer."
                onCancel={() => {
                    setOpen(false);
                    setFin('conservada');
                }}
                onConfirm={() => {
                    setOpen(false);
                    setFin('borrada');
                }}
                onOpenChange={(next) => {
                    if (!next) {
                        setFin('conservada');
                    }

                    setOpen(next);
                }}
                open={open}
                title="Borrar la conexión gateway-local"
            />
            <p className="text-xs text-text-secondary">La conexión quedó: {fin}</p>
        </div>
    );
}
