import { SplitHalf, SplitPane } from '@mandor/ui';
import { useState } from 'react';

/**
 * Dos mitades y la línea entre ellas. La línea flota sobre el corte: no tiene carril propio,
 * así que dos hijos escritos son dos mitades y nada que contabilizar.
 */
export function PanelesDemo() {
    const [ancho, setAncho] = useState(40);
    const [alto, setAlto] = useState(55);

    return (
        <div className="flex flex-col gap-gap-section">
            <div className="h-44">
                <SplitPane
                    className="h-full"
                    label="Divisor del centro"
                    onValueChange={setAncho}
                    value={ancho}
                >
                    <SplitHalf className="flex items-center justify-center text-sm text-text-secondary">
                        Componer
                    </SplitHalf>
                    <SplitHalf className="flex items-center justify-center text-sm text-text-secondary">
                        Respuesta
                    </SplitHalf>
                </SplitPane>
            </div>
            <p className="text-xs text-text-secondary">
                Arrastra, mueve con ← → (8 px, con Shift 32 px) o doble clic para el centro. Ahora:
                {` ${String(Math.round(ancho))} %.`}
            </p>
            <div className="h-44">
                <SplitPane
                    className="h-full"
                    direction="column"
                    label="Divisor apilado"
                    onValueChange={setAlto}
                    value={alto}
                >
                    <SplitHalf className="flex items-center justify-center text-sm text-text-secondary">
                        Petición
                    </SplitHalf>
                    <SplitHalf className="flex items-center justify-center text-sm text-text-secondary">
                        Historial
                    </SplitHalf>
                </SplitPane>
            </div>
            <p className="text-xs text-text-secondary">
                Apilado: ↑ ↓ mueven el mismo paso. Ahora: {` ${String(Math.round(alto))} %.`}
            </p>
        </div>
    );
}
