import { Button, SaveChangesDialog } from '@mandor/ui';
import { useState } from 'react';

/**
 * La pregunta antes de cerrar algo con cambios sin guardar: guardar, no guardar o quedarse. El
 * primario guarda; no guardar no es rojo, porque solo termina una edición. El foco empieza en
 * Cancelar, y Esc también se queda.
 */
export function GuardarDemo() {
    const [open, setOpen] = useState(false);
    const [fin, setFin] = useState('sin respuesta');
    const answer = (what: string): void => {
        setOpen(false);
        setFin(what);
    };

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Button
                variant="secondary"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Cerrar pestaña
            </Button>
            {/* modal-policy: irreversible-confirmation */}
            <SaveChangesDialog
                cancelLabel="Cancelar"
                description="Si no los guardas, se pierden."
                discardLabel="No guardar"
                onCancel={() => {
                    answer('abierta');
                }}
                onDiscard={() => {
                    answer('cerrada sin guardar');
                }}
                onSave={() => {
                    answer('guardada y cerrada');
                }}
                open={open}
                saveLabel="Guardar"
                title="¿Guardar los cambios de «Login»?"
            />
            <p className="text-xs text-text-secondary">La pestaña quedó: {fin}</p>
        </div>
    );
}
