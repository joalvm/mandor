import { CodeEditor } from '@mandor/ui';
import { useState } from 'react';

const IZQUIERDA = { editor: 'Documento, vista izquierda' };
const DERECHA = { editor: 'Documento, vista derecha' };

/**
 * Dos vistas de un mismo documento: la misma `modelKey` comparte texto, cursor y deshacer.
 * Escribe en una y la otra sigue; es el documento, no la vista, el que se guarda.
 */
export function Compartido() {
    const [texto, setTexto] = useState('El documento es uno.\n');

    return (
        <div className="grid h-40 grid-cols-2 gap-gap-control">
            <div className="min-h-0 min-w-0 overflow-hidden rounded-md">
                <CodeEditor
                    labels={IZQUIERDA}
                    language="markdown"
                    modelKey="lab-espejo"
                    onValueChange={setTexto}
                    value={texto}
                />
            </div>
            <div className="min-h-0 min-w-0 overflow-hidden rounded-md">
                <CodeEditor
                    labels={DERECHA}
                    language="markdown"
                    modelKey="lab-espejo"
                    value={texto}
                />
            </div>
        </div>
    );
}
