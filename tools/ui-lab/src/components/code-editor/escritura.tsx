import { CodeEditor } from '@mandor/ui';
import { useState } from 'react';

const ETIQUETAS = { editor: 'Carga útil' };

const INICIO = '{\n    "url": "wss://gateway.local/v1",\n    "reintentos": 3\n}';

/**
 * El editor escribiendo: lo que se teclea vuelve por `onValueChange` y las marcas del idioma
 * aparecen solas. La caja mide lo que el montador le da; el editor llena el hueco.
 */
export function Escritura() {
    const [texto, setTexto] = useState(INICIO);

    return (
        <div className="flex h-44 flex-col gap-gap-control">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md">
                <CodeEditor
                    labels={ETIQUETAS}
                    language="jsonc"
                    modelKey="lab-carga"
                    onValueChange={setTexto}
                    value={texto}
                />
            </div>
            <p className="text-xs text-text-secondary">
                {texto.length} caracteres · rompe el JSON a propósito y mira la marca
            </p>
        </div>
    );
}
