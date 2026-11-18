import { IconButton } from '@mandor/ui';
import { useState } from 'react';

/**
 * El estado pulsado se pinta de selección y se anuncia con aria-pressed; el glifo no cambia.
 * Apunta al segundo: apagado con motivo, el tooltip dice por qué.
 */
export function ActivaDemo() {
    const [grabando, setGrabando] = useState(false);

    return (
        <>
            <IconButton
                active={grabando}
                icon="record"
                label={grabando ? 'Parar la grabación' : 'Grabar'}
                onClick={() => {
                    setGrabando(!grabando);
                }}
            />
            <IconButton
                disabled
                disabledReason="Sin conexión con el repo"
                icon="refresh"
                label="Sincronizar"
            />
        </>
    );
}
